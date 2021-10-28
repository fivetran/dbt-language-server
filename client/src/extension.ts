import * as path from 'path';
import { commands, Disposable, ExtensionContext, languages, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, State, TransportKind, WorkDoneProgress } from 'vscode-languageclient/node';
import { ProgressHandler } from './ProgressHandler';
import { PythonExtension } from './PythonExtension';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { TelemetryClient } from './TelemetryClient';

let client: LanguageClient;

export function activate(context: ExtensionContext): void {
  console.log('Congratulations, your extension "dbt-language-server" is now active!');
  // The server is implemented in node
  const serverModule = context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  // The debug options for the server
  // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };

  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'sql' },
      { scheme: 'file', language: 'jinja-sql' },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/target/manifest.json'),
    },
  };

  // Create the language client and start the client.
  client = new LanguageClient('dbtFivetranExtension', 'Dbt Language Client', serverOptions, clientOptions);

  registerSqlPreviewContentProvider(context);

  const progressHandler = new ProgressHandler();
  progressHandler.begin();

  client.onTelemetry(([name, properties]) => {
    TelemetryClient.sendEvent(name, properties);
  });

  client.onDidChangeState(e => {
    if (e.newState === State.Running) {
      TelemetryClient.sendEvent('activate');

      client.onNotification('custom/updateQueryPreview', ([uri, text]) => {
        SqlPreviewContentProvider.update(uri, text);
      });

      client.onRequest('custom/getPython', async () => {
        return await new PythonExtension().getPython();
      });

      client.onProgress(WorkDoneProgress.type, 'Progress', progressHandler.onProgress.bind(progressHandler));

      commands.executeCommand('setContext', 'dbt-language-server.init', true);
      console.log('Client switched to state "Running"');
    } else {
      commands.executeCommand('setContext', 'dbt-language-server.init', false);
    }
  });

  client.onReady().catch(reason => {
    if (reason && reason.name && reason.message) {
      TelemetryClient.sendException(reason);
    }
  });

  window.onDidChangeActiveTextEditor(e => {
    if (!e || e.document.uri.toString() === SqlPreviewContentProvider.uri.toString()) {
      return;
    }
    SqlPreviewContentProvider.changeActiveDocument(e.document.uri.toString());
  });

  context.subscriptions.push(
    commands.registerCommand('dbt.compile', () => {
      if (!window.activeTextEditor) {
        return;
      }
      const { document } = window.activeTextEditor;
      if (document.languageId !== 'sql' && document.languageId !== 'jinja-sql') {
        return;
      }

      const uri =
        document.uri.toString() === SqlPreviewContentProvider.uri.toString() ? SqlPreviewContentProvider.activeDocUri : document.uri.toString();
      client.sendNotification('custom/dbtCompile', uri);
    }),

    commands.registerCommand('dbt.getProgressPromise', () => {
      return progressHandler.getPromise();
    }),

    commands.registerCommand('editor.afterFunctionCompletion', () => {
      commands.executeCommand('cursorMove', {
        to: 'left',
        by: 'wrappedLine',
        select: false,
        value: 1,
      });
      commands.executeCommand('editor.action.triggerParameterHints');
    }),
    TelemetryClient.activate(context),
  );

  // Start the client. This will also launch the server
  client.start();
}

function registerSqlPreviewContentProvider(context: ExtensionContext) {
  const provider = new SqlPreviewContentProvider();

  const providerRegistrations = Disposable.from(workspace.registerTextDocumentContentProvider(SqlPreviewContentProvider.scheme, provider));

  const commandRegistration = commands.registerTextEditorCommand('editor.showQueryPreview', async editor => {
    SqlPreviewContentProvider.changeActiveDocument(editor.document.uri.toString());

    const doc = await workspace.openTextDocument(SqlPreviewContentProvider.uri);
    await window.showTextDocument(doc, editor.viewColumn + 1, true);
    await languages.setTextDocumentLanguage(doc, 'sql');
  });

  context.subscriptions.push(provider, commandRegistration, providerRegistrations);
}

// This method is called when extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  if (!client) {
    return undefined;
  }
  return client.stop();
}
