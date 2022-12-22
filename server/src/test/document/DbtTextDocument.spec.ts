/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { assertThat } from 'hamjest';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { Emitter, Range, TextDocumentSaveReason, VersionedTextDocumentIdentifier } from 'vscode-languageserver';
import { BigQueryContext } from '../../bigquery/BigQueryContext';
import { DbtRepository } from '../../DbtRepository';
import { Dbt } from '../../dbt_execution/Dbt';
import { DiagnosticGenerator } from '../../DiagnosticGenerator';
import { DbtDocumentKind } from '../../document/DbtDocumentKind';
import { DbtTextDocument } from '../../document/DbtTextDocument';
import { JinjaParser } from '../../JinjaParser';
import { ModelCompiler } from '../../ModelCompiler';
import { NotificationSender } from '../../NotificationSender';
import { ProgressReporter } from '../../ProgressReporter';
import { sleep } from '../helper';

describe('DbtTextDocument', () => {
  const TEXT = 'select 1;';

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

    const dbtRepository = new DbtRepository();
    document = new DbtTextDocument(
      { uri: 'uri', languageId: 'sql', version: 1, text: TEXT },
      DbtDocumentKind.MODEL,
      '',
      mock(NotificationSender),
      mock(ProgressReporter),
      instance(mockModelCompiler),
      instance(mockJinjaParser),
      onGlobalDbtErrorFixedEmitter,
      dbtRepository,
      instance(mockDbt),
      new BigQueryContext(),
      new DiagnosticGenerator(dbtRepository),
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
