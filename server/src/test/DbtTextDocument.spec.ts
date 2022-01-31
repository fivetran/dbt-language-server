import { SimpleCatalog, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { instance, mock, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentSaveReason, _Connection } from 'vscode-languageserver';
import { CompletionProvider } from '../CompletionProvider';
import { DbtRpcServer } from '../DbtRpcServer';
import { DbtTextDocument } from '../DbtTextDocument';
import { JinjaDefinitionProvider } from '../definition/JinjaDefinitionProvider';
import { JinjaParser } from '../JinjaParser';
import { ModelCompiler } from '../ModelCompiler';
import { ProgressReporter } from '../ProgressReporter';
import { SchemaTracker } from '../SchemaTracker';
import { ZetaSqlCatalog } from '../ZetaSqlCatalog';
import { sleep } from './helper';
import Long = require('long');

describe('DbtTextDocument', () => {
  const TEXT = 'select 1;';

  let document: DbtTextDocument;
  let mockModelCompiler: ModelCompiler;
  let mockJinjaParser: JinjaParser;
  let mockSchemaTracker: SchemaTracker;
  let mockZetaSqlCatalog: ZetaSqlCatalog;
  let mockZetaSqlClient: ZetaSQLClient;

  beforeEach(() => {
    DbtTextDocument.DEBOUNCE_TIMEOUT = 0;

    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    mockJinjaParser = mock(JinjaParser);
    mockSchemaTracker = mock(SchemaTracker);
    mockZetaSqlCatalog = mock(ZetaSqlCatalog);

    const simpleCatalog = new SimpleCatalog('catalog');
    simpleCatalog.registeredId = new Long(1);
    simpleCatalog.builtinFunctionOptions = { languageOptions: {} };
    when(mockZetaSqlCatalog.getCatalog()).thenReturn(simpleCatalog);

    mockZetaSqlClient = mock(ZetaSQLClient);

    document = new DbtTextDocument(
      { uri: 'uri', languageId: 'sql', version: 1, text: TEXT },
      mock<_Connection>(),
      mock(ProgressReporter),
      mock(CompletionProvider),
      mock(JinjaDefinitionProvider),
      instance(mockModelCompiler),
      instance(mockJinjaParser),
      instance(mockSchemaTracker),
      instance(mockZetaSqlCatalog),
      instance(mockZetaSqlClient),
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
      verify(mockModelCompiler.compile()).once();
    });

    it('Should compile twice if debounce timeout exceeded between compile calls', async () => {
      // act
      document.forceRecompile();
      await sleepMoreThanDebounceTime();
      document.forceRecompile();

      // assert
      await sleepMoreThanDebounceTime();
      verify(mockModelCompiler.compile()).twice();
    });
  });

  it('Should compile for first save in Not Auto save mode', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.Manual);
    const mockRpcServer = mock(DbtRpcServer);
    await document.didSaveTextDocument(instance(mockRpcServer));
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockRpcServer.refreshServer()).once();
    verify(mockModelCompiler.compile()).twice();
  });

  it('Should not compile for first save in Auto save mode', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    document.willSaveTextDocument(TextDocumentSaveReason.AfterDelay);
    const mockRpcServer = mock(DbtRpcServer);
    await document.didSaveTextDocument(instance(mockRpcServer));
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockRpcServer.refreshServer()).never();
    verify(mockModelCompiler.compile()).once();
  });

  it('Should not compile once when opening', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(true);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile()).once();
  });

  it('Should not compile query without jinja', async () => {
    // arrange
    when(mockJinjaParser.hasJinjas(TEXT)).thenReturn(false);
    when(mockJinjaParser.findAllJinjaRanges(document.rawDocument)).thenReturn([]);

    // act
    await document.didOpenTextDocument();
    await sleepMoreThanDebounceTime();

    // assert
    verify(mockModelCompiler.compile()).never();
  });

  async function sleepMoreThanDebounceTime(): Promise<void> {
    await sleep(2 * DbtTextDocument.DEBOUNCE_TIMEOUT);
  }
});
