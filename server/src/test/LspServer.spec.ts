import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { anything, instance, mock, spy, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentIdentifier, _Connection } from 'vscode-languageserver';
import { CompletionProvider } from '../CompletionProvider';
import { DbtTextDocument } from '../DbtTextDocument';
import { JinjaDefinitionProvider } from '../definition/JinjaDefinitionProvider';
import { JinjaParser } from '../JinjaParser';
import { LspServer } from '../LspServer';
import { ModelCompiler } from '../ModelCompiler';
import { ProgressReporter } from '../ProgressReporter';
import { SchemaTracker } from '../SchemaTracker';
import { ZetaSqlCatalog } from '../ZetaSqlCatalog';
import { sleep } from './helper';

describe('LspServer', () => {
  const OPENED_URI = 'uri_opened';
  const LINKED_URI = 'uri_linked';
  const SQL_LANGUAGE_ID = 'sql';
  const TEXT = 'select 1;';
  const TEST_DEBOUNCE_PERIOD = 300;
  const MORE_THAN_DEBOUNCE = TEST_DEBOUNCE_PERIOD + 100;

  let mockModelCompiler: ModelCompiler;
  let lspServer: LspServer;
  let spiedLspServer: LspServer;
  let document: DbtTextDocument;

  beforeEach(() => {
    lspServer = new LspServer(mock<_Connection>());
    LspServer.OPEN_CLOSE_DEBOUNCE_PERIOD = TEST_DEBOUNCE_PERIOD;
    lspServer.onDidOpenTextDocument = (): Promise<void> => Promise.resolve();
    lspServer.onDidCloseTextDocument = (): Promise<void> => Promise.resolve();

    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    document = new DbtTextDocument(
      { uri: OPENED_URI, languageId: SQL_LANGUAGE_ID, version: 1, text: TEXT },
      mock<_Connection>(),
      mock(ProgressReporter),
      mock(CompletionProvider),
      mock(JinjaDefinitionProvider),
      instance(mockModelCompiler),
      mock(JinjaParser),
      mock(SchemaTracker),
      mock(ZetaSqlCatalog),
      mock(ZetaSQLClient),
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
