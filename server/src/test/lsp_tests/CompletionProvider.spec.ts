import { assertThat } from 'hamjest';
import { spawn } from 'node:child_process';
import { StreamMessageReader, StreamMessageWriter } from 'vscode-jsonrpc/node';
import {
  CompletionItem,
  CompletionItemKind,
  CompletionParams,
  CompletionRequest,
  CompletionTriggerKind,
  createProtocolConnection,
  DidChangeTextDocumentNotification,
  DidChangeTextDocumentParams,
  DidOpenTextDocumentNotification,
  DidOpenTextDocumentParams,
  ExitNotification,
  InitializedNotification,
  InitializeParams,
  InitializeRequest,
  InsertTextFormat,
  ProtocolConnection,
  Range,
  ShowMessageRequest,
  ShowMessageRequestParams,
  ShutdownRequest,
} from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import path = require('path');

describe('CompletionProvider', () => {
  const PROJECT_PATH = './server/src/test/lsp_tests/project';
  const DOCUMENT_URI = URI.file(path.resolve(PROJECT_PATH, 'models', 'default_document.sql')).toString();

  let connection: ProtocolConnection;
  let version = 1;

  before(async () => {
    const args = ['-r', 'ts-node/register', path.resolve('server', 'out', 'server.js'), '--stdio'];
    const child = spawn('node', args, { cwd: path.resolve(PROJECT_PATH) });
    child.on('exit', code => {
      assertThat(code, 0);
    });
    child.stdout.on('data', (data: string) => {
      console.log(`stdout: ${data}\n`);
    });
    child.stderr.on('data', (data: string) => {
      console.log(`stderr: ${data}\n`);
    });
    connection = createProtocolConnection(new StreamMessageReader(child.stdout), new StreamMessageWriter(child.stdin));
    connection.onRequest(ShowMessageRequest.type, (params: ShowMessageRequestParams) => {
      console.log(params.message);
      return 0;
    });

    connection.listen();

    const initParams: InitializeParams = {
      capabilities: {},
      initializationOptions: {
        lspMode: 'dbtProject',
        disableLogger: true,
      },
      processId: process.pid,
      rootUri: '/',
    };

    await connection.sendRequest(InitializeRequest.type, initParams);
    await connection.sendNotification(InitializedNotification.type, {});
    const didOpenParams: DidOpenTextDocumentParams = {
      textDocument: {
        uri: DOCUMENT_URI,
        languageId: 'sql',
        version: 1,
        text: '',
      },
    };
    await connection.sendNotification(DidOpenTextDocumentNotification.type, didOpenParams);
  });

  after(async () => {
    await connection.sendRequest(ShutdownRequest.type);
    await connection.sendNotification(ExitNotification.type);
  });

  it('Should return ref snippet', async () => {
    await completionRequestShouldReturnSnippet('ref', {
      label: 'ref',
      detail: 'dbt Ref',
      sortText: '1ref',
      insertText: "{{ ref('$0') }}",
      insertTextFormat: InsertTextFormat.Snippet,
      kind: CompletionItemKind.Snippet,
      command: {
        title: 'triggerSuggest',
        command: 'editor.action.triggerSuggest',
      },
    });
  });

  it('Should return config snippet', async () => {
    await completionRequestShouldReturnSnippet('confi', {
      label: 'config',
      detail: 'dbt Config',
      sortText: '1config',
      insertText: "{{\n  config(\n    materialized='${1|table,view,incremental,ephemeral|}'\n  )\n}}\n",
      insertTextFormat: InsertTextFormat.Snippet,
      kind: CompletionItemKind.Snippet,
    });
  });

  async function completionRequestShouldReturnSnippet(documentText: string, expectedItem: CompletionItem): Promise<void> {
    // arrange
    const changeDocParams: DidChangeTextDocumentParams = {
      textDocument: {
        uri: DOCUMENT_URI,
        version: ++version,
      },
      contentChanges: [
        {
          range: Range.create(0, 0, 0, 100),
          text: documentText,
        },
      ],
    };
    await connection.sendNotification(DidChangeTextDocumentNotification.type, changeDocParams);

    const completionParams: CompletionParams = {
      textDocument: {
        uri: DOCUMENT_URI,
      },
      position: {
        line: 0,
        character: 0,
      },
      context: {
        triggerKind: CompletionTriggerKind.Invoked,
      },
    };

    // act
    const response = await connection.sendRequest(CompletionRequest.type, completionParams);
    console.log(response);

    // assert
    assertThat(response, [expectedItem]);
  }
});
