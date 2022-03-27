import { assertThat } from 'hamjest';
import { anything, instance, mock, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentSaveReason, _Connection } from 'vscode-languageserver';
import { CompletionProvider } from '../CompletionProvider';
import { DbtRpcServer } from '../DbtRpcServer';
import { DbtTextDocument } from '../DbtTextDocument';
import { JinjaDefinitionProvider } from '../definition/JinjaDefinitionProvider';
import { JinjaParser } from '../JinjaParser';
import { ModelCompiler } from '../ModelCompiler';
import { ProgressReporter } from '../ProgressReporter';
import { sleep } from './helper';

describe('DbtTextDocument', () => {
  const TEXT = 'select 1;';

  let document: DbtTextDocument;
  let mockModelCompiler: ModelCompiler;
  let mockJinjaParser: JinjaParser;

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

    document = new DbtTextDocument(
      { uri: 'uri', languageId: 'sql', version: 1, text: TEXT },
      '',
      mock<_Connection>(),
      mock(ProgressReporter),
      mock(CompletionProvider),
      mock(JinjaDefinitionProvider),
      instance(mockModelCompiler),
      instance(mockJinjaParser),
      onGlobalDbtErrorFixedEmitter,
      undefined,
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
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument(false);
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.Manual);
    const mockRpcServer = mock(DbtRpcServer);
    await document.didSaveTextDocument(instance(mockRpcServer));
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockRpcServer.refreshServer()).once();
    verify(mockModelCompiler.compile(anything())).twice();
  });

  it('Should not compile for first save in Auto save mode', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument(false);
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.AfterDelay);
    const mockRpcServer = mock(DbtRpcServer);
    await document.didSaveTextDocument(instance(mockRpcServer));
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockRpcServer.refreshServer()).never();
    verify(mockModelCompiler.compile(anything())).once();
  });

  it('Should not compile once when opening', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument(false);
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything())).once();
  });

  it('Should not compile query without jinja', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(false);
    when(mockJinjaParser.findAllJinjaRanges(document.rawDocument)).thenReturn([]);

    // act
    await document.didOpenTextDocument(false);
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything())).never();
  });

  it('Should compile for first open if manifest.json does not exist if jinja not found', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(false);
    when(mockJinjaParser.findAllJinjaRanges(document.rawDocument)).thenReturn([]);

    // act
    await document.didOpenTextDocument(true);
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile(anything())).once();
  });

  it('Should set hasDbtError flag on dbt compilation error', () => {
    // act
    onCompilationErrorEmitter.fire('error');

    // assert
    assertThat(document.hasDbtError, true);
  });

  it('Should reset hasDbtError flag on dbt compilation finished', () => {
    // act
    document.hasDbtError = true;
    onCompilationFinishedEmitter.fire('select 1;');

    // assert
    assertThat(document.hasDbtError, false);
  });

  it('Should reset hasDbtError flag on dbt error fixed', () => {
    // act
    document.hasDbtError = true;
    onGlobalDbtErrorFixedEmitter.fire();

    // assert
    assertThat(document.hasDbtError, false);
  });

  async function sleepMoreThanDebounceTime(): Promise<void> {
    await sleep(2 * DbtTextDocument.DEBOUNCE_TIMEOUT);
  }
});
