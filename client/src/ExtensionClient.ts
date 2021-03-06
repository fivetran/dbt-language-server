import * as fs from 'fs';
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

export const SUPPORTED_LANG_IDS = ['sql', 'jinja-sql', 'sql-bigquery'];

export interface PackageJson {
  name: string;
  version: string;
  aiKey: string;
}

export class ExtensionClient {
  static readonly DEFAULT_PACKAGES_PATHS = ['dbt_packages', 'dbt_modules'];

  serverAbsolutePath: string;
  outputChannel: OutputChannel;
  previewContentProvider = new SqlPreviewContentProvider();
  progressHandler = new ProgressHandler();
  workspaceHelper = new WorkspaceHelper();
  clients: Map<string, DbtLanguageClient> = new Map();
  packageJson?: PackageJson;

  constructor(private context: ExtensionContext) {
    this.serverAbsolutePath = this.context.asAbsolutePath(path.join('server', 'out', 'server.js'));
    this.outputChannel = window.createOutputChannel('dbt Wizard');
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
          client.stop().catch(e => console.log(`Error while stopping client: ${e instanceof Error ? e.message : String(e)}`));
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

    this.parseVersion();
    TelemetryClient.activate(this.context, this.packageJson);
    TelemetryClient.sendEvent('activate');
  }

  parseVersion(): void {
    const extensionPath = path.join(this.context.extensionPath, 'package.json');
    this.packageJson = JSON.parse(fs.readFileSync(extensionPath, 'utf8')) as PackageJson;
    this.outputChannel.appendLine(`dbt Wizard version: ${this.packageJson.version}`);
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

  registerCommand(command: string, callback: (...args: unknown[]) => unknown): void {
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
      await client.initialize();

      void this.progressHandler.begin();

      client.start();
      this.clients.set(projectUri.toString(), client);
    }
  }

  /** We expect the dbt project folder to be the folder containing the dbt_project.yml file. This folder is used to run dbt-rpc. */
  async getDbtProjectUri(fileUri: Uri): Promise<Uri | undefined> {
    const folder = workspace.getWorkspaceFolder(fileUri);
    if (!folder) {
      return undefined;
    }

    const projectFolder = [...this.clients.keys()].find(k => fileUri.toString().startsWith(k));
    if (projectFolder) {
      return Uri.parse(projectFolder);
    }

    const outerWorkspace = this.workspaceHelper.getOuterMostWorkspaceFolder(folder);

    let currentUri = fileUri;
    do {
      currentUri = Uri.joinPath(currentUri, '..');
      try {
        await workspace.fs.stat(currentUri.with({ path: `${currentUri.path}/dbt_project.yml` }));
        const oneLevelUpPath = Uri.joinPath(currentUri, '..').path;
        if (ExtensionClient.DEFAULT_PACKAGES_PATHS.some(p => oneLevelUpPath.endsWith(p))) {
          continue;
        }
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
