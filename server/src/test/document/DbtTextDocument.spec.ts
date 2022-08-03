/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { assertThat } from 'hamjest';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentSaveReason } from 'vscode-languageserver';
import { DbtCompletionProvider } from '../../completion/DbtCompletionProvider';
import { DbtContext } from '../../DbtContext';
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
import { SqlCompletionProvider } from '../../SqlCompletionProvider';
import { sleep } from '../helper';
import path = require('path');

describe('DbtTextDocument', () => {
  const TEXT = 'select 1;';
  const WORKSPACE = path.normalize('/workspace');

  let document: DbtTextDocument;
  let mockModelCompiler: ModelCompiler;
  let mockJinjaParser: JinjaParser;
  let mockDbt: Dbt;
  let dbtContext: DbtContext;

  const onCompilationErrorEmitter = new Emitter<string>();
  const onCompilationFinishedEmitter = new Emitter<string>();
  const onGlobalDbtErrorFixedEmitter = new Emitter<void>();

  beforeEach(() => {
    DbtTextDocument.DEBOUNCE_TIMEOUT = 0;

    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(onCompilationErrorEmitter.event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(onCompilationFinishedEmitter.event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    mockJinjaParser = mock(JinjaParser);
    mockDbt = mock<Dbt>();

    dbtContext = new DbtContext();
    dbtContext.dbtReady = true;
    dbtContext.dbt = instance(mockDbt);

    document = new DbtTextDocument(
      { uri: 'uri', languageId: 'sql', version: 1, text: TEXT },
      DbtDocumentKind.MODEL,
      '',
      mock(NotificationSender),
      mock(ProgressReporter),
      mock(SqlCompletionProvider),
      mock(DbtCompletionProvider),
      mock(DbtDefinitionProvider),
      instance(mockModelCompiler),
      instance(mockJinjaParser),
      onGlobalDbtErrorFixedEmitter,
      new DbtRepository(),
      dbtContext,
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
      verify(mockModelCompiler.compile(anything())).once();
    });

    it('Should compile twice if debounce timeout exceeded between compile calls', async () => {
      // act
      document.forceRecompile();
      await sleepMoreThanDebounceTime();
      document.forceRecompile();

      // assert
      await sleepMoreThanDebounceTime();
      verify(mockModelCompiler.compile(anything())).twice();
    });
  });

  it('Should compile for first save in Not Auto save mode', async () => {
    // arrange
    let count = 0;
    when(mockDbt.refresh()).thenCall(() => count++);
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.Manual);
    await document.didSaveTextDocument(true);
    await sleepMoreThanDebounceTime();

    // assert
    assertThat(count, 1);
    verify(mockModelCompiler.compile(anything())).twice();
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
    verify(mockModelCompiler.compile(anything())).once();
  });

  it('Should not compile once when opening', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything())).once();
  });

  it('Should not compile query without jinja', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(false);
    when(mockJinjaParser.findAllJinjaRanges(document.rawDocument)).thenReturn([]);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything())).never();
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

  async function sleepMoreThanDebounceTime(): Promise<void> {
    await sleep(2 * DbtTextDocument.DEBOUNCE_TIMEOUT);
  }
});
