import * as fs from 'fs';
import { commands, DiagnosticCollection, ExtensionContext, languages, TextDocument, TextEditor, Uri, ViewColumn, window, workspace } from 'vscode';
import { DBT_ADAPTERS } from './DbtAdapters';
import { DbtLanguageClient } from './DbtLanguageClient';
import { OutputChannelProvider } from './OutputChannelProvider';
import { ProgressHandler } from './ProgressHandler';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
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
  outputChannelProvider = new OutputChannelProvider();
  previewContentProvider = new SqlPreviewContentProvider();
  progressHandler = new ProgressHandler();
  statusHandler = new StatusHandler();
  workspaceHelper = new WorkspaceHelper();
  clients: Map<string, DbtLanguageClient> = new Map();
  packageJson?: PackageJson;

  constructor(private context: ExtensionContext) {
    this.serverAbsolutePath = this.context.asAbsolutePath(path.join('server', 'out', 'server.js'));
  }

  public onActivate(): void {
    console.log('Extension "dbt-language-server" is now active!');

    this.context.subscriptions.push(
      workspace.onDidOpenTextDocument(this.onDidOpenTextDocument.bind(this)),
      workspace.onDidChangeWorkspaceFolders(event => {
        for (const folder of event.removed) {
          const client = this.clients.get(folder.uri.path);
          if (client) {
            this.clients.delete(folder.uri.path);
            client.stop().catch(e => console.log(`Error while stopping client: ${e instanceof Error ? e.message : String(e)}`));
          }
        }
      }),

      workspace.onDidChangeTextDocument(e => {
        if (e.document.uri.path === SqlPreviewContentProvider.URI.path) {
          this.previewContentProvider.updatePreviewDiagnostics(this.getDiagnostics());
        }
      }),

      window.onDidChangeActiveTextEditor(async e => {
        if (!e || e.document.uri.path === SqlPreviewContentProvider.URI.path) {
          return;
        }

        if (SUPPORTED_LANG_IDS.includes(e.document.languageId)) {
          this.previewContentProvider.changeActiveDocument(e.document.uri);

          const projectFolder = await this.getDbtProjectUri(e.document.uri);
          if (projectFolder) {
            this.statusHandler.updateLanguageItems(projectFolder.path);
          }
        }
      }),
    );
    workspace.textDocuments.forEach(t =>
      this.onDidOpenTextDocument(t).catch(e => console.log(`Error while opening text document ${e instanceof Error ? e.message : String(e)}`)),
    );
    this.registerSqlPreviewContentProvider(this.context);

    this.registerCommands();

    this.parseVersion();
    TelemetryClient.activate(this.context, this.packageJson);
    TelemetryClient.sendEvent('activate');
  }

  parseVersion(): void {
    const extensionPath = path.join(this.context.extensionPath, 'package.json');
    this.packageJson = JSON.parse(fs.readFileSync(extensionPath, 'utf8')) as PackageJson;
    this.outputChannelProvider.getMainLogChannel().appendLine(`dbt Wizard version: ${this.packageJson.version}`);
  }

  registerCommands(): void {
    this.registerCommand('dbtWizard.compile', async () => {
      const client = await this.getClientForActiveDocument();
      if (client) {
        client.sendNotification('custom/dbtCompile', window.activeTextEditor?.document.uri.toString());
        await commands.executeCommand('dbtWizard.showQueryPreview');
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

    this.registerCommand('dbtWizard.installLatestDbt', async (projectPath?: unknown, skipDialog?: unknown) => {
      const client = projectPath === undefined ? await this.getClientForActiveDocument() : this.getClientByPath(projectPath as string);
      if (client) {
        const answer =
          skipDialog === undefined
            ? await window.showInformationMessage('Are you sure you want to install the latest version of dbt?', { modal: true }, 'Yes', 'No')
            : 'Yes';
        if (answer === 'Yes') {
          client.sendNotification('dbtWizard/installLatestDbt');
          this.outputChannelProvider.getInstallLatestDbtChannel().show();
          await commands.executeCommand('workbench.action.focusActiveEditorGroup');
        }
      } else {
        window.showWarningMessage('First, open the model from the dbt project.').then(undefined, e => {
          console.log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`);
        });
      }
    });

    this.registerCommand('dbtWizard.installDbtAdapters', async (projectPath?: unknown) => {
      const client = projectPath === undefined ? await this.getClientForActiveDocument() : this.getClientByPath(projectPath as string);
      if (client) {
        const dbtAdapter = await window.showQuickPick(DBT_ADAPTERS, {
          placeHolder: 'Select dbt adapter to install',
        });

        client.sendNotification('dbtWizard/installDbtAdapter', dbtAdapter);
        this.outputChannelProvider.getInstallDbtAdaptersChannel().show();
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }
    });

    this.registerCommand('dbtWizard.restart', async () => {
      const client = await this.getClientForActiveDocument();
      await client?.restart();
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

  async getClientForActiveDocument(): Promise<DbtLanguageClient | undefined> {
    const document = this.getCommandDocument();
    if (document === undefined) {
      console.log(`Can't find active document`);
      return undefined;
    }

    const uri = document.uri.path === SqlPreviewContentProvider.URI.path ? this.previewContentProvider.activeDocUri : document.uri;

    return this.getClientByUri(uri);
  }

  async getClientByUri(uri: Uri): Promise<DbtLanguageClient | undefined> {
    const projectUri = await this.getDbtProjectUri(uri);
    return projectUri ? this.getClientByPath(projectUri.path) : undefined;
  }

  getClientByPath(projectPath: string): DbtLanguageClient | undefined {
    return this.clients.get(projectPath);
  }

  registerCommand(command: string, callback: (...args: unknown[]) => unknown): void {
    this.context.subscriptions.push(commands.registerCommand(command, callback));
  }

  registerSqlPreviewContentProvider(context: ExtensionContext): void {
    const providerRegistrations = workspace.registerTextDocumentContentProvider(SqlPreviewContentProvider.SCHEME, this.previewContentProvider);
    const commandRegistration = commands.registerTextEditorCommand('dbtWizard.showQueryPreview', async (editor: TextEditor) => {
      if (editor.document.uri.path === SqlPreviewContentProvider.URI.path) {
        return;
      }

      const projectUri = await this.getDbtProjectUri(editor.document.uri);
      if (!projectUri) {
        return;
      }

      this.previewContentProvider.changeActiveDocument(editor.document.uri);

      const doc = await workspace.openTextDocument(SqlPreviewContentProvider.URI);
      const preserveFocus = window.visibleTextEditors.some(e => e.document.uri.path === SqlPreviewContentProvider.URI.path);
      await window.showTextDocument(doc, ViewColumn.Beside, preserveFocus);
      if (!preserveFocus) {
        await commands.executeCommand('workbench.action.lockEditorGroup');
        await commands.executeCommand('workbench.action.focusPreviousGroup');
      }
      await languages.setTextDocumentLanguage(doc, 'sql');
      this.previewContentProvider.updatePreviewDiagnostics(this.getDiagnostics());
    });

    context.subscriptions.push(this.previewContentProvider, commandRegistration, providerRegistrations);
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

    if (!this.clients.has(projectUri.path)) {
      const client = new DbtLanguageClient(
        6009 + this.clients.size,
        this.outputChannelProvider,
        this.serverAbsolutePath,
        projectUri,
        this.previewContentProvider,
        this.progressHandler,
        this.statusHandler,
      );
      this.context.subscriptions.push(client);
      await client.initialize();

      void this.progressHandler.begin();

      client.start();
      this.clients.set(projectUri.path, client);
    }
  }

  /** We expect the dbt project folder to be the folder containing the dbt_project.yml file. This folder is used to run dbt-rpc. */
  async getDbtProjectUri(fileUri: Uri): Promise<Uri | undefined> {
    const folder = workspace.getWorkspaceFolder(fileUri);
    if (!folder) {
      return undefined;
    }

    const projectFolder = [...this.clients.keys()].find(k => fileUri.path.startsWith(k));
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
