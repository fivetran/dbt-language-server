import {
  commands,
  ExtensionContext,
  languages,
  OutputChannel,
  TextDocument,
  TextEditor,
  Uri,
  ViewColumn,
  window,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import { State, WorkDoneProgress } from 'vscode-languageclient';
import { LanguageClient, TransportKind } from 'vscode-languageclient/node';
import { ProgressHandler } from './ProgressHandler';
import { PythonExtension } from './PythonExtension';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { TelemetryClient } from './TelemetryClient';
import path = require('path');

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

const SUPPORTED_LANG_IDS = ['sql', 'jinja-sql'];

export class LspClient {
  previewContentProvider = new SqlPreviewContentProvider();
  progressHandler = new ProgressHandler();
  sortedWorkspaceFolders?: string[];
  clients: Map<string, LanguageClient> = new Map();
  module: string;
  outputChannel: OutputChannel;

  constructor(private context: ExtensionContext) {
    this.module = this.context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    this.outputChannel = window.createOutputChannel('Dbt Language Server');
  }

  public async onActivate(): Promise<void> {
    console.log('Congratulations, your extension "dbt-language-server" is now active!');

    workspace.onDidOpenTextDocument(this.onDidOpenTextDocument.bind(this));
    workspace.textDocuments.forEach(t => this.onDidOpenTextDocument(t));
    workspace.onDidChangeWorkspaceFolders(event => {
      this.sortedWorkspaceFolders = undefined;
      for (const folder of event.removed) {
        const client = this.clients.get(folder.uri.toString());
        if (client) {
          this.clients.delete(folder.uri.toString());
          void client.stop();
        }
      }
    });

    this.registerSqlPreviewContentProvider(this.context);

    this.registerCommands();

    TelemetryClient.activate(this.context);
    TelemetryClient.sendEvent('activate');
  }

  initializeClient(client: LanguageClient): void {
    this.context.subscriptions.push(
      client.onTelemetry((e: TelemetryEvent) => {
        TelemetryClient.sendEvent(e.name, e.properties);
      }),
    );

    client.onDidChangeState(async e => {
      if (e.newState === State.Running) {
        this.context.subscriptions.push(
          client.onNotification('custom/updateQueryPreview', ([uri, text]) => {
            this.previewContentProvider.update(uri, text);
          }),

          client.onRequest('custom/getPython', async () => {
            return await new PythonExtension().getPython();
          }),

          await client.onProgress(WorkDoneProgress.type, 'Progress', v => this.progressHandler.onProgress(v)),
        );

        await commands.executeCommand('setContext', 'dbt-language-server.init', true);
        console.log('Client switched to state "Running"');
      } else {
        await commands.executeCommand('setContext', 'dbt-language-server.init', false);
      }
    });

    client.onReady().catch(reason => {
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
      if (!SUPPORTED_LANG_IDS.includes(document.languageId)) {
        return;
      }

      const uri = document.uri.toString() === SqlPreviewContentProvider.uri.toString() ? this.previewContentProvider.activeDocUri : document.uri;
      this.getClient(uri)?.sendNotification('custom/dbtCompile', uri.toString());
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

  getClient(uri: Uri): LanguageClient | undefined {
    const folder = workspace.getWorkspaceFolder(uri);
    if (!folder) {
      return;
    }
    const outerFolder = this.getOuterMostWorkspaceFolder(folder);
    return this.clients.get(outerFolder.uri.toString());
  }

  registerCommand(command: string, callback: (...args: any[]) => any): void {
    this.context.subscriptions.push(commands.registerCommand(command, callback));
  }

  registerSqlPreviewContentProvider(context: ExtensionContext): void {
    const providerRegistrations = workspace.registerTextDocumentContentProvider(SqlPreviewContentProvider.scheme, this.previewContentProvider);
    const commandRegistration = commands.registerTextEditorCommand('editor.showQueryPreview', async (editor: TextEditor) => {
      if (editor.document.uri.toString() === SqlPreviewContentProvider.uri.toString()) {
        return;
      }

      this.previewContentProvider.changeActiveDocument(editor.document.uri);

      const doc = await workspace.openTextDocument(SqlPreviewContentProvider.uri);
      await window.showTextDocument(doc, ViewColumn.Beside, true);
      await languages.setTextDocumentLanguage(doc, 'sql');
    });

    const eventRegistration = window.onDidChangeActiveTextEditor(e => {
      if (!e || e.document.uri.toString() === SqlPreviewContentProvider.uri.toString()) {
        return;
      }
      this.previewContentProvider.changeActiveDocument(e.document.uri);
    });

    context.subscriptions.push(this.previewContentProvider, commandRegistration, providerRegistrations, eventRegistration);
  }

  onDidOpenTextDocument(document: TextDocument): void {
    if (!SUPPORTED_LANG_IDS.includes(document.languageId) || document.uri.scheme !== 'file') {
      return;
    }

    const uri = document.uri;
    const folder = workspace.getWorkspaceFolder(uri);
    console.log(folder);

    if (!folder) {
      return;
    }

    const outerFolder = this.getOuterMostWorkspaceFolder(folder);

    if (!this.clients.has(outerFolder.uri.toString())) {
      const client = this.createLanguageClient(outerFolder);
      this.initializeClient(client);

      void this.progressHandler.begin();

      client.start();
      this.clients.set(outerFolder.uri.toString(), client);
    }
  }

  createLanguageClient(outerFolder: WorkspaceFolder): LanguageClient {
    const debugOptions = { execArgv: ['--nolazy', `--inspect=${6009 + this.clients.size}`] };
    const serverOptions = {
      run: { module: this.module, transport: TransportKind.ipc },
      debug: { module: this.module, transport: TransportKind.ipc, options: debugOptions },
    };

    const clientOptions = {
      documentSelector: SUPPORTED_LANG_IDS.map(langId => ({ scheme: 'file', language: langId, pattern: `${outerFolder.uri.fsPath}/**/*` })),
      synchronize: {
        fileEvents: workspace.createFileSystemWatcher('**/target/manifest.json'),
      },
      workspaceFolder: outerFolder,
      outputChannel: this.outputChannel,
    };

    return new LanguageClient('dbt-language-server', 'Dbt Language Client', serverOptions, clientOptions);
  }

  getOuterMostWorkspaceFolder(folder: WorkspaceFolder): WorkspaceFolder {
    const sorted = this.getSortedWorkspaceFolders();
    for (const element of sorted) {
      let uri = folder.uri.toString();
      if (uri.charAt(uri.length - 1) !== '/') {
        uri = uri + '/';
      }
      if (uri.startsWith(element)) {
        const outerFolder = workspace.getWorkspaceFolder(Uri.parse(element));
        if (!outerFolder) {
          throw new Error("Can't find outer most workspace folder");
        }
        return outerFolder;
      }
    }
    return folder;
  }

  getSortedWorkspaceFolders(): string[] {
    if (this.sortedWorkspaceFolders === undefined) {
      this.sortedWorkspaceFolders = workspace.workspaceFolders
        ? workspace.workspaceFolders
            .map(folder => {
              let result = folder.uri.toString();
              if (result.charAt(result.length - 1) !== '/') {
                result = result + '/';
              }
              return result;
            })
            .sort((a, b) => a.length - b.length)
        : [];
    }
    return this.sortedWorkspaceFolders;
  }

  onDeactivate(): Thenable<void> {
    const promises: Thenable<void>[] = [];
    for (const client of this.clients.values()) {
      promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
  }
}
