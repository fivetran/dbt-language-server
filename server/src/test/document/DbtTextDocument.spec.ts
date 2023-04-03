/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { assertThat } from 'hamjest';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { Emitter, Range, TextDocumentSaveReason, VersionedTextDocumentIdentifier } from 'vscode-languageserver';
import { DbtRepository } from '../../DbtRepository';
import { DestinationContext } from '../../DestinationContext';
import { DiagnosticGenerator } from '../../DiagnosticGenerator';
import { HoverProvider } from '../../HoverProvider';
import { JinjaParser } from '../../JinjaParser';
import { ModelCompiler } from '../../ModelCompiler';
import { ModelProgressReporter } from '../../ModelProgressReporter';
import { NotificationSender } from '../../NotificationSender';
import { ProjectChangeListener } from '../../ProjectChangeListener';
import { SignatureHelpProvider } from '../../SignatureHelpProvider';
import { Dbt } from '../../dbt_execution/Dbt';
import { DbtDefinitionProvider } from '../../definition/DbtDefinitionProvider';
import { SqlDefinitionProvider } from '../../definition/SqlDefinitionProvider';
import { DbtDocumentKind } from '../../document/DbtDocumentKind';
import { DbtTextDocument } from '../../document/DbtTextDocument';
import { sleep } from '../helper';
import path = require('node:path');

describe('DbtTextDocument', () => {
  const TEXT = 'select 1;';
  const PROJECT_PATH = path.normalize('/project/path');
  const FILE_URI = 'file:///project/path/models/model.sql';

  let document: DbtTextDocument;
  let mockModelCompiler: ModelCompiler;
  let mockJinjaParser: JinjaParser;
  let mockDbt: Dbt;
  let mockProjectChangeListener: ProjectChangeListener;
  let destinationContext: DestinationContext;

  const onCompilationErrorEmitter = new Emitter<string>();
  const onCompilationFinishedEmitter = new Emitter<string>();
  const onDbtReadyEmitter = new Emitter<void>();

  beforeEach(() => {
    DbtTextDocument.DEBOUNCE_TIMEOUT = 0;

    mockModelCompiler = mock(ModelCompiler);
    mockProjectChangeListener = mock(ProjectChangeListener);
    when(mockModelCompiler.onCompilationError).thenReturn(onCompilationErrorEmitter.event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(onCompilationFinishedEmitter.event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    mockJinjaParser = mock(JinjaParser);

    mockDbt = mock<Dbt>();
    when(mockDbt.dbtReady).thenReturn(true);
    when(mockDbt.onDbtReady).thenReturn(onDbtReadyEmitter.event);

    const dbtRepository = new DbtRepository(PROJECT_PATH, Promise.resolve(undefined));
    destinationContext = new DestinationContext();
    document = new DbtTextDocument(
      { uri: FILE_URI, languageId: 'sql', version: 1, text: TEXT },
      DbtDocumentKind.MODEL,
      mock(NotificationSender),
      mock(ModelProgressReporter),
      instance(mockModelCompiler),
      instance(mockJinjaParser),
      dbtRepository,
      instance(mockDbt),
      destinationContext,
      new DiagnosticGenerator(dbtRepository),
      new SignatureHelpProvider(),
      new HoverProvider(),
      new DbtDefinitionProvider(dbtRepository),
      new SqlDefinitionProvider(dbtRepository),
      instance(mockProjectChangeListener),
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
    await document.didSaveTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything(), true)).twice();
  });

  it('Should not compile for first save in Auto save mode', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.AfterDelay);
    await document.didSaveTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
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
    document.didChangeTextDocument({ textDocument: VersionedTextDocumentIdentifier.create(FILE_URI, 1), contentChanges: [] });
    await document.didSaveTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything(), true)).once();
  });

  it('Should set dbtErrorUri on dbt compilation error', () => {
    // act
    onCompilationErrorEmitter.fire('error');

    // assert
    verify(mockProjectChangeListener.setDbtError(FILE_URI, 'error')).once();
  });

  it('Should reset dbtErrorUri on dbt compilation finished', () => {
    // act
    destinationContext.contextInitialized = true;
    onCompilationFinishedEmitter.fire('select 1;');

    // assert
    verify(mockProjectChangeListener.setDbtError(FILE_URI, undefined)).once();
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
