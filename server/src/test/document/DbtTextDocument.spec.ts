/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { assertThat } from 'hamjest';
import * as path from 'node:path';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { Emitter, Range, TextDocumentSaveReason, VersionedTextDocumentIdentifier } from 'vscode-languageserver';
import { DbtRepository } from '../../DbtRepository';
import { Dbt } from '../../dbt_execution/Dbt';
import { DbtDefinitionProvider } from '../../definition/DbtDefinitionProvider';
import { DestinationState } from '../../DestinationState';
import { DbtDocumentKind } from '../../document/DbtDocumentKind';
import { DbtTextDocument } from '../../document/DbtTextDocument';
import { JinjaParser } from '../../JinjaParser';
import { ModelCompiler } from '../../ModelCompiler';
import { NotificationSender } from '../../NotificationSender';
import { ProgressReporter } from '../../ProgressReporter';
import { sleep } from '../helper';

describe('DbtTextDocument', () => {
  const TEXT = 'select 1;';
  const WORKSPACE = path.normalize('/workspace');

  let document: DbtTextDocument;
  let mockModelCompiler: ModelCompiler;
  let mockJinjaParser: JinjaParser;
  let mockDbt: Dbt;

  const onCompilationErrorEmitter = new Emitter<string>();
  const onCompilationFinishedEmitter = new Emitter<string>();
  const onGlobalDbtErrorFixedEmitter = new Emitter<void>();
  const onDbtReadyEmitter = new Emitter<void>();

  beforeEach(() => {
    DbtTextDocument.DEBOUNCE_TIMEOUT = 0;

    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(onCompilationErrorEmitter.event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(onCompilationFinishedEmitter.event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    mockJinjaParser = mock(JinjaParser);

    mockDbt = mock<Dbt>();
    when(mockDbt.dbtReady).thenReturn(true);
    when(mockDbt.onDbtReady).thenReturn(onDbtReadyEmitter.event);

    document = new DbtTextDocument(
      { uri: 'uri', languageId: 'sql', version: 1, text: TEXT },
      DbtDocumentKind.MODEL,
      '',
      mock(NotificationSender),
      mock(ProgressReporter),
      mock(DbtDefinitionProvider),
      instance(mockModelCompiler),
      instance(mockJinjaParser),
      onGlobalDbtErrorFixedEmitter,
      new DbtRepository(),
      instance(mockDbt),
      new DestinationState(),
    );
  });

  describe('Debounce tests', () => {
    it('Should compile only once', async () => {
      // act
      document.forceRecompile();
      document.forceRecompile();
      document.forceRecompile();
      document.forceRecompile();

      // assert
      await sleepMoreThanDebounceTime();
      verify(mockModelCompiler.compile(anything(), true)).once();
    });

    it('Should compile twice if debounce timeout exceeded between compile calls', async () => {
      // act
      document.forceRecompile();
      await sleepMoreThanDebounceTime();
      document.forceRecompile();

      // assert
      await sleepMoreThanDebounceTime();
      verify(mockModelCompiler.compile(anything(), true)).twice();
    });
  });

  it('Should compile for first save in Not Auto save mode', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.Manual);
    await document.didSaveTextDocument(true);
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockDbt.refresh()).once();
    verify(mockModelCompiler.compile(anything(), true)).twice();
  });

  it('Should not compile for first save in Auto save mode', async () => {
    // arrange
    let count = 0;
    when(mockDbt.refresh()).thenCall(() => count++);
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.AfterDelay);
    await document.didSaveTextDocument(true);
    await sleepMoreThanDebounceTime();

    // assert
    assertThat(count, 0);
    verify(mockModelCompiler.compile(anything(), true)).once();
  });

  it('Should not compile once when opening', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything(), true)).once();
  });

  it('Should not compile query without jinja', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(false);
    when(mockJinjaParser.findAllJinjaRanges(document.rawDocument)).thenReturn([]);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything(), true)).never();
  });

  it('didSaveTextDocument should start compilation if previous compile stuck (document contains jinjas and raw document text is the same as compiled)', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(false);
    when(mockJinjaParser.findAllJinjaRanges(document.rawDocument)).thenReturn([Range.create(0, 0, 1, 1)]);
    when(mockJinjaParser.isJinjaModified(anything(), anything())).thenReturn(false);

    // act
    document.didChangeTextDocument({ textDocument: VersionedTextDocumentIdentifier.create('uri', 1), contentChanges: [] });
    await document.didSaveTextDocument(true);
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything(), true)).once();
  });

  it('Should set hasDbtError flag on dbt compilation error', () => {
    // act
    onCompilationErrorEmitter.fire('error');

    // assert
    assertThat(document.currentDbtError, 'error');
  });

  it('Should reset hasDbtError flag on dbt compilation finished', () => {
    // act
    document.currentDbtError = 'error';
    onCompilationFinishedEmitter.fire('select 1;');

    // assert
    assertThat(document.currentDbtError, undefined);
  });

  it('Should reset hasDbtError flag on dbt error fixed', () => {
    // act
    document.currentDbtError = 'error';
    onGlobalDbtErrorFixedEmitter.fire();

    // assert
    assertThat(document.currentDbtError, undefined);
  });

  it('Should return path', () => {
    // arrange
    const dbtRepository = new DbtRepository();

    // act
    const name = DbtTextDocument.getModelPathOrFullyQualifiedName('/workspace/models/model.sql', WORKSPACE, dbtRepository);

    // assert
    assertThat(name, path.normalize('models/model.sql'));
  });

  it('Should return fully qualified model name', () => {
    // arrange
    const dbtRepository = new DbtRepository();

    // act
    const name = DbtTextDocument.getModelPathOrFullyQualifiedName('/workspace/dbt_packages/package/models/model.sql', WORKSPACE, dbtRepository);

    // assert
    assertThat(name, 'package.model');
  });

  it('Should compile dbt document when dbt ready', async () => {
    // arrange
    when(mockDbt.dbtReady).thenReturn(false).thenReturn(true);
    let compileCalls = 0;
    document.debouncedCompile = (): void => {
      compileCalls++;
    };
    document.requireCompileOnSave = true;

    // act
    await document.didOpenTextDocument();
    onDbtReadyEmitter.fire();

    // assert
    assertThat(compileCalls, 1);
  });

  async function sleepMoreThanDebounceTime(): Promise<void> {
    await sleep(2 * DbtTextDocument.DEBOUNCE_TIMEOUT);
  }
});
