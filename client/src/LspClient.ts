import { commands, ExtensionContext, languages, TextEditor, ViewColumn, window, workspace } from 'vscode';
import { LanguageClientOptions, State, WorkDoneProgress } from 'vscode-languageclient';
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { ProgressHandler } from './ProgressHandler';
import { PythonExtension } from './PythonExtension';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { TelemetryClient } from './TelemetryClient';
import path = require('path');

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export class LspClient {
  previewContentProvider = new SqlPreviewContentProvider();
  progressHandler = new ProgressHandler();

  client: LanguageClient;

  constructor(private ctx: ExtensionContext) {
    const serverModule = this.ctx.asAbsolutePath(path.join('server', 'out', 'server.js'));
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

    this.client = new LanguageClient('dbtFivetranExtension', 'Dbt Language Client', serverOptions, clientOptions);
  }

  public async onActivate(): Promise<void> {
    console.log('Congratulations, your extension "dbt-language-server" is now active!');

    await this.progressHandler.begin();

    this.initializeClient();
    this.registerSqlPreviewContentProvider(this.ctx);

    this.registerCommands();

    TelemetryClient.activate(this.ctx);
    TelemetryClient.sendEvent('activate');

    // Start the client. This will also launch the server
    this.client.start();
  }

  initializeClient(): void {
    this.ctx.subscriptions.push(
      this.client.onTelemetry((e: TelemetryEvent) => {
        TelemetryClient.sendEvent(e.name, e.properties);
      }),
    );

    this.client.onDidChangeState(async e => {
      if (e.newState === State.Running) {
        this.ctx.subscriptions.push(
          this.client.onNotification('custom/updateQueryPreview', ([uri, text]) => {
            this.previewContentProvider.update(uri, text);
          }),

          this.client.onRequest('custom/getPython', async () => {
            return await new PythonExtension().getPython();
          }),

          await this.client.onProgress(WorkDoneProgress.type, 'Progress', v => this.progressHandler.onProgress(v)),
        );

        await commands.executeCommand('setContext', 'dbt-language-server.init', true);
        console.log('Client switched to state "Running"');
      } else {
        await commands.executeCommand('setContext', 'dbt-language-server.init', false);
      }
    });

    this.client.onReady().catch(reason => {
      if (reason && reason.name && reason.message) {
        TelemetryClient.sendException(reason);
      }
    });
  }

  registerCommands(): void {
    this.registerCommand('dbt.compile', async () => {
      if (!window.activeTextEditor) {
        return;
      }
      const { document } = window.activeTextEditor;
      if (document.languageId !== 'sql' && document.languageId !== 'jinja-sql') {
        return;
      }

      const uri =
        document.uri.toString() === SqlPreviewContentProvider.uri.toString() ? this.previewContentProvider.activeDocUri : document.uri.toString();
      this.client.sendNotification('custom/dbtCompile', uri);

      await commands.executeCommand('editor.showQueryPreview');
    });

    this.registerCommand('editor.afterFunctionCompletion', async () => {
      await commands.executeCommand('cursorMove', {
        to: 'left',
        by: 'wrappedLine',
        select: false,
        value: 1,
      });
      await commands.executeCommand('editor.action.triggerParameterHints');
    });
  }

  registerCommand(command: string, callback: (...args: any[]) => any): void {
    this.ctx.subscriptions.push(commands.registerCommand(command, callback));
  }

  registerSqlPreviewContentProvider(context: ExtensionContext): void {
    const providerRegistrations = workspace.registerTextDocumentContentProvider(SqlPreviewContentProvider.scheme, this.previewContentProvider);
    const commandRegistration = commands.registerTextEditorCommand('editor.showQueryPreview', async (editor: TextEditor) => {
      if (editor.document.uri.toString() === SqlPreviewContentProvider.uri.toString()) {
        return;
      }

      this.previewContentProvider.changeActiveDocument(editor.document.uri.toString());

      const doc = await workspace.openTextDocument(SqlPreviewContentProvider.uri);
      await window.showTextDocument(doc, ViewColumn.Beside, true);
      await languages.setTextDocumentLanguage(doc, 'sql');
    });

    const eventRegistration = window.onDidChangeActiveTextEditor(e => {
      if (!e || e.document.uri.toString() === SqlPreviewContentProvider.uri.toString()) {
        return;
      }
      this.previewContentProvider.changeActiveDocument(e.document.uri.toString());
    });

    context.subscriptions.push(this.previewContentProvider, commandRegistration, providerRegistrations, eventRegistration);
  }

  onDeactivate(): Thenable<void> | undefined {
    if (!this.client) {
      return undefined;
    }
    return this.client.stop();
  }
}
