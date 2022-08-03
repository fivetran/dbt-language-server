/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { anything, instance, mock, spy, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentIdentifier, _Connection } from 'vscode-languageserver';
import { BigQueryContext } from '../bigquery/BigQueryContext';
import { DbtCompletionProvider } from '../completion/DbtCompletionProvider';
import { DbtContext } from '../DbtContext';
import { DbtDestinationContext } from '../DbtDestinationContext';
import { DbtRepository } from '../DbtRepository';
import { DbtDefinitionProvider } from '../definition/DbtDefinitionProvider';
import { DbtDocumentKind } from '../document/DbtDocumentKind';
import { DbtTextDocument } from '../document/DbtTextDocument';
import { JinjaParser } from '../JinjaParser';
import { LspServer } from '../LspServer';
import { ModelCompiler } from '../ModelCompiler';
import { NotificationSender } from '../NotificationSender';
import { ProgressReporter } from '../ProgressReporter';
import { SqlCompletionProvider } from '../SqlCompletionProvider';
import { sleep } from './helper';

describe('LspServer', () => {
  const OPENED_URI = 'uri_opened';
  const LINKED_URI = 'uri_linked';
  const SQL_LANGUAGE_ID = 'sql';
  const TEXT = 'select 1;';
  const TEST_DEBOUNCE_PERIOD = 0;
  const MORE_THAN_DEBOUNCE = TEST_DEBOUNCE_PERIOD + 1;

  let mockModelCompiler: ModelCompiler;
  let lspServer: LspServer;
  let spiedLspServer: LspServer;
  let document: DbtTextDocument;
  let dbtRepository: DbtRepository;
  let mockBigQueryContext: BigQueryContext;

  const dbtDestinationContext = new DbtDestinationContext();

  beforeEach(() => {
    lspServer = new LspServer(mock<_Connection>());
    LspServer.OPEN_CLOSE_DEBOUNCE_PERIOD = TEST_DEBOUNCE_PERIOD;
    lspServer.onDidOpenTextDocument = (): Promise<void> => Promise.resolve();

    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    dbtRepository = mock(DbtRepository);
    mockBigQueryContext = mock(BigQueryContext);
    dbtDestinationContext.bigQueryContext = mockBigQueryContext;

    document = new DbtTextDocument(
      { uri: OPENED_URI, languageId: SQL_LANGUAGE_ID, version: 1, text: TEXT },
      DbtDocumentKind.MODEL,
      '',
      mock<_Connection>(),
      mock(NotificationSender),
      mock(ProgressReporter),
      mock(SqlCompletionProvider),
      mock(DbtCompletionProvider),
      mock(DbtDefinitionProvider),
      instance(mockModelCompiler),
      mock(JinjaParser),
      new Emitter<void>(),
      dbtRepository,
      new DbtContext(),
      dbtDestinationContext,
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
  });

  it('Should open document if server did not receive close request in debounce period', async () => {
    // arrange
    lspServer.isLanguageServerReady = (): Promise<boolean> => Promise.resolve(true);

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
    lspServer.isLanguageServerReady = (): Promise<boolean> => Promise.resolve(true);
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
  });
});
