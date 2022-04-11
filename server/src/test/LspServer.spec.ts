import { anything, instance, mock, spy, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentIdentifier, _Connection } from 'vscode-languageserver';
import { BigQueryContext } from '../bigquery/BigQueryContext';
import { DbtCompletionProvider } from '../completion/DbtCompletionProvider';
import { DbtRepository } from '../DbtRepository';
import { DbtTextDocument } from '../DbtTextDocument';
import { DbtDefinitionProvider } from '../definition/DbtDefinitionProvider';
import { JinjaParser } from '../JinjaParser';
import { LspServer } from '../LspServer';
import { ModelCompiler } from '../ModelCompiler';
import { ProgressReporter } from '../ProgressReporter';
import { SqlCompletionProvider } from '../SqlCompletionProvider';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import { sleep } from './helper';

describe('LspServer', () => {
  const OPENED_URI = 'uri_opened';
  const LINKED_URI = 'uri_linked';
  const SQL_LANGUAGE_ID = 'sql';
  const TEXT = 'select 1;';
  const TEST_DEBOUNCE_PERIOD = 0;
  const MORE_THAN_DEBOUNCE = TEST_DEBOUNCE_PERIOD + 1;

  let mockModelCompiler: ModelCompiler;
  let mockZetaSqlWrapper: ZetaSqlWrapper;
  let lspServer: LspServer;
  let spiedLspServer: LspServer;
  let document: DbtTextDocument;
  let dbtRepository: DbtRepository;
  let mockBigQueryContext: BigQueryContext;

  beforeEach(() => {
    lspServer = new LspServer(mock<_Connection>());
    LspServer.OPEN_CLOSE_DEBOUNCE_PERIOD = TEST_DEBOUNCE_PERIOD;
    lspServer.onDidOpenTextDocument = (): Promise<void> => Promise.resolve();
    lspServer.onDidCloseTextDocument = (): Promise<void> => Promise.resolve();

    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    mockZetaSqlWrapper = mock(ZetaSqlWrapper);
    when(mockZetaSqlWrapper.isSupported()).thenReturn(true);

    dbtRepository = mock(DbtRepository);
    mockBigQueryContext = mock(BigQueryContext);

    document = new DbtTextDocument(
      { uri: OPENED_URI, languageId: SQL_LANGUAGE_ID, version: 1, text: TEXT },
      '',
      mock<_Connection>(),
      mock(ProgressReporter),
      mock(SqlCompletionProvider),
      mock(DbtCompletionProvider),
      mock(DbtDefinitionProvider),
      instance(mockModelCompiler),
      mock(JinjaParser),
      new Emitter<void>(),
      dbtRepository,
      mockBigQueryContext,
    );
    lspServer.openedDocuments.set(OPENED_URI, document);

    spiedLspServer = spy(lspServer);
  });

  it('Should not open document if server received close request right after open one', async () => {
    // act
    const onDidOpenEnded = lspServer.onDidOpenTextDocumentDelayed({
      textDocument: {
        uri: LINKED_URI,
        languageId: SQL_LANGUAGE_ID,
        version: 1,
        text: 'text',
      },
    });
    lspServer.onDidCloseTextDocumentDelayed({ textDocument: TextDocumentIdentifier.create(LINKED_URI) });
    await onDidOpenEnded;

    // assert
    verify(spiedLspServer.onDidOpenTextDocument(anything())).never();
    verify(spiedLspServer.onDidCloseTextDocument(anything())).never();
  });

  it('Should open document if server did not receive close request in debounce period', async () => {
    // act
    const onDidOpenEnded = lspServer.onDidOpenTextDocumentDelayed({
      textDocument: {
        uri: LINKED_URI,
        languageId: SQL_LANGUAGE_ID,
        version: 1,
        text: 'text',
      },
    });
    await sleep(MORE_THAN_DEBOUNCE).then(() => lspServer.onDidCloseTextDocumentDelayed({ textDocument: TextDocumentIdentifier.create(LINKED_URI) }));
    await onDidOpenEnded;

    // assert
    verify(spiedLspServer.onDidOpenTextDocument(anything())).once();
  });

  it('Should compile after declined open request', async () => {
    // arrange
    const openDocumentParams = {
      textDocument: {
        uri: LINKED_URI,
        languageId: SQL_LANGUAGE_ID,
        version: 1,
        text: 'text',
      },
    };

    // act
    const definitionOpen = lspServer.onDidOpenTextDocumentDelayed(openDocumentParams);
    lspServer.onDidCloseTextDocumentDelayed({ textDocument: TextDocumentIdentifier.create(LINKED_URI) });
    const manualOpen = lspServer.onDidOpenTextDocumentDelayed(openDocumentParams);
    await Promise.all([definitionOpen, manualOpen]);

    // assert
    verify(spiedLspServer.onDidOpenTextDocument(anything())).once();
    verify(spiedLspServer.onDidCloseTextDocument(anything())).never();
  });
});
