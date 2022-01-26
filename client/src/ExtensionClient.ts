import {
  commands,
  DiagnosticCollection,
  ExtensionContext,
  languages,
  OutputChannel,
  TextDocument,
  TextEditor,
  Uri,
  ViewColumn,
  window,
  workspace,
} from 'vscode';
import { DbtLanguageClient } from './DbtLanguageClient';
import { ProgressHandler } from './ProgressHandler';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { TelemetryClient } from './TelemetryClient';
import { WorkspaceHelper } from './WorkspaceHelper';
import path = require('path');

export const SUPPORTED_LANG_IDS = ['sql', 'jinja-sql'];

export class ExtensionClient {
  serverAbsolutePath: string;
  outputChannel: OutputChannel;
  previewContentProvider = new SqlPreviewContentProvider();
  progressHandler = new ProgressHandler();
  workspaceHelper = new WorkspaceHelper();
  clients: Map<string, DbtLanguageClient> = new Map();

  constructor(private context: ExtensionContext) {
    this.serverAbsolutePath = this.context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    this.outputChannel = window.createOutputChannel('dbt Language Server');
  }

  public onActivate(): void {
    console.log('Extension "dbt-language-server" is now active!');

    workspace.onDidOpenTextDocument(this.onDidOpenTextDocument.bind(this));
    workspace.textDocuments.forEach(t => void this.onDidOpenTextDocument(t));
    workspace.onDidChangeWorkspaceFolders(event => {
      for (const folder of event.removed) {
        const client = this.clients.get(folder.uri.toString());
        if (client) {
          this.clients.delete(folder.uri.toString());
          void client.stop();
        }
      }
    });
    workspace.onDidChangeTextDocument(e => {
      if (e.document.uri.toString() === SqlPreviewContentProvider.URI.toString()) {
        this.previewContentProvider.updatePreviewDiagnostics(this.getDiagnostics());
      }
    });

    this.registerSqlPreviewContentProvider(this.context);

    this.registerCommands();

    TelemetryClient.activate(this.context);
    TelemetryClient.sendEvent('activate');
  }

  registerCommands(): void {
    this.registerCommand('dbt.compile', async () => {
      const document = this.getCommandDocument();
      if (!document) {
        return;
      }

      const uri = document.uri.toString() === SqlPreviewContentProvider.URI.toString() ? this.previewContentProvider.activeDocUri : document.uri;

      const client = await this.getClient(uri);
      if (client) {
        client.sendNotification('custom/dbtCompile', uri.toString());
        await commands.executeCommand('editor.showQueryPreview');
      }
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

    this.registerCommand('dbt.refToSql', () => this.convertTo('sql'));
    this.registerCommand('dbt.sqlToRef', () => this.convertTo('ref'));
  }

  async convertTo(to: 'sql' | 'ref'): Promise<void> {
    const document = this.getCommandDocument();
    if (!document) {
      return;
    }

    (await this.getClient(document.uri))?.sendNotification('custom/convertTo', { uri: document.uri.toString(), to });
  }

  getCommandDocument(): TextDocument | undefined {
    if (!window.activeTextEditor) {
      return undefined;
    }

    const { document } = window.activeTextEditor;
    if (!SUPPORTED_LANG_IDS.includes(document.languageId)) {
      return undefined;
    }

    return document;
  }

  async getClient(uri: Uri): Promise<DbtLanguageClient | undefined> {
    const projectFolder = await this.getDbtProjectUri(uri);
    return projectFolder ? this.clients.get(projectFolder.toString()) : undefined;
  }

  registerCommand(command: string, callback: (...args: any[]) => any): void {
    this.context.subscriptions.push(commands.registerCommand(command, callback));
  }

  registerSqlPreviewContentProvider(context: ExtensionContext): void {
    const providerRegistrations = workspace.registerTextDocumentContentProvider(SqlPreviewContentProvider.SCHEME, this.previewContentProvider);
    const commandRegistration = commands.registerTextEditorCommand('editor.showQueryPreview', async (editor: TextEditor) => {
      if (editor.document.uri.toString() === SqlPreviewContentProvider.URI.toString()) {
        return;
      }

      const projectUri = await this.getDbtProjectUri(editor.document.uri);
      if (!projectUri) {
        return;
      }

      this.previewContentProvider.changeActiveDocument(editor.document.uri);

      const doc = await workspace.openTextDocument(SqlPreviewContentProvider.URI);
      await window.showTextDocument(doc, ViewColumn.Beside, true);
      await languages.setTextDocumentLanguage(doc, 'sql');
      this.previewContentProvider.updatePreviewDiagnostics(this.getDiagnostics());
    });

    const eventRegistration = window.onDidChangeActiveTextEditor(e => {
      if (!e || e.document.uri.toString() === SqlPreviewContentProvider.URI.toString()) {
        return;
      }
      this.previewContentProvider.changeActiveDocument(e.document.uri);
    });

    context.subscriptions.push(this.previewContentProvider, commandRegistration, providerRegistrations, eventRegistration);
  }

  getDiagnostics(): DiagnosticCollection | undefined {
    const [[, client]] = this.clients;
    return client.client.diagnostics;
  }

  async onDidOpenTextDocument(document: TextDocument): Promise<void> {
    if (!SUPPORTED_LANG_IDS.includes(document.languageId) || document.uri.scheme !== 'file') {
      return;
    }

    const projectUri = await this.getDbtProjectUri(document.uri);
    if (!projectUri) {
      return;
    }

    if (!this.clients.has(projectUri.toString())) {
      const client = new DbtLanguageClient(
        6009 + this.clients.size,
        this.outputChannel,
        this.serverAbsolutePath,
        projectUri,
        this.previewContentProvider,
        this.progressHandler,
      );
      this.context.subscriptions.push(client);
      client.initialize();

      void this.progressHandler.begin();

      client.start();
      this.clients.set(projectUri.toString(), client);
    }
  }

  /** We expect the dbt project folder to be the folder containing the dbt_project.yml file. This folder is used to run dbt-rpc. */
  async getDbtProjectUri(uri: Uri): Promise<Uri | undefined> {
    const folder = workspace.getWorkspaceFolder(uri);
    if (!folder) {
      return undefined;
    }

    const projectFolder = [...this.clients.keys()].find(k => uri.toString().startsWith(k));
    if (projectFolder) {
      return Uri.parse(projectFolder);
    }

    const outerWorkspace = this.workspaceHelper.getOuterMostWorkspaceFolder(folder);

    let currentUri = uri;
    do {
      currentUri = Uri.joinPath(currentUri, '..');
      try {
        await workspace.fs.stat(currentUri.with({ path: `${currentUri.path}/dbt_project.yml` }));
        return currentUri;
      } catch (e) {
        // file does not exist
      }
    } while (currentUri.path !== outerWorkspace.uri.path);
    return undefined;
  }

  onDeactivate(): Thenable<void> {
    const promises: Thenable<void>[] = [];
    for (const client of this.clients.values()) {
      promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
  }
}
