import * as fs from 'fs';
import { commands, ExtensionContext, languages, TextDocument, TextEditor, Uri, ViewColumn, window, workspace } from 'vscode';
import { DBT_ADAPTERS } from './DbtAdapters';
import { DbtLanguageClientManager } from './DbtLanguageClientManager';
import { OutputChannelProvider } from './OutputChannelProvider';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { TelemetryClient } from './TelemetryClient';

import path = require('path');

export const SUPPORTED_LANG_IDS = ['sql', 'jinja-sql', 'sql-bigquery'];

export interface PackageJson {
  name: string;
  version: string;
  aiKey: string;
}

export class ExtensionClient {
  static readonly DEFAULT_PACKAGES_PATHS = ['dbt_packages', 'dbt_modules'];

  outputChannelProvider = new OutputChannelProvider();
  previewContentProvider = new SqlPreviewContentProvider();
  statusHandler = new StatusHandler();
  dbtLanguageClientManager: DbtLanguageClientManager;
  packageJson?: PackageJson;

  constructor(private context: ExtensionContext) {
    this.dbtLanguageClientManager = new DbtLanguageClientManager(
      this.previewContentProvider,
      this.outputChannelProvider,
      this.context.asAbsolutePath(path.join('server', 'out', 'server.js')),
      this.statusHandler,
    );
  }

  public onActivate(): void {
    console.log('Extension "dbt-language-server" is now active!');

    this.context.subscriptions.push(
      workspace.onDidOpenTextDocument(this.onDidOpenTextDocument.bind(this)),
      workspace.onDidChangeWorkspaceFolders(event => {
        for (const folder of event.removed) {
          this.dbtLanguageClientManager.stopClient(folder.uri.path);
        }
      }),

      workspace.onDidChangeTextDocument(e => {
        if (e.document.uri.path === SqlPreviewContentProvider.URI.path) {
          this.previewContentProvider.updatePreviewDiagnostics(this.dbtLanguageClientManager.getDiagnostics());
        }
      }),

      window.onDidChangeActiveTextEditor(async e => {
        if (!e || e.document.uri.path === SqlPreviewContentProvider.URI.path) {
          return;
        }

        if (SUPPORTED_LANG_IDS.includes(e.document.languageId)) {
          this.previewContentProvider.changeActiveDocument(e.document.uri);

          const projectFolder = await this.dbtLanguageClientManager.getDbtProjectUri(e.document.uri);
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
      const client = await this.dbtLanguageClientManager.getClientForActiveDocument();
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
      const client =
        projectPath === undefined
          ? await this.dbtLanguageClientManager.getClientForActiveDocument()
          : this.dbtLanguageClientManager.getClientByPath(projectPath as string);
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
      const client =
        projectPath === undefined
          ? await this.dbtLanguageClientManager.getClientForActiveDocument()
          : this.dbtLanguageClientManager.getClientByPath(projectPath as string);
      if (client) {
        const dbtAdapter = await window.showQuickPick(DBT_ADAPTERS, {
          placeHolder: 'Select dbt adapter to install',
        });

        client.sendNotification('dbtWizard/installDbtAdapter', dbtAdapter);
        this.outputChannelProvider.getInstallDbtAdaptersChannel().show();
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }
    });

    this.registerCommand('dbtWizard.openOrCreatePackagesYml', async (projectPath: unknown) => {
      const column = window.activeTextEditor?.viewColumn;
      const fileUri = Uri.joinPath(Uri.parse(projectPath as string), 'packages.yml');

      try {
        const document = await workspace.openTextDocument(fileUri);
        await window.showTextDocument(document, column);
      } catch {
        const doc = await workspace.openTextDocument(fileUri.with({ scheme: 'untitled' }));
        await window.showTextDocument(doc, column);
      }
    });

    this.registerCommand('dbtWizard.restart', async () => {
      const client = await this.dbtLanguageClientManager.getClientForActiveDocument();
      await client?.restart();
    });
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

      const projectUri = await this.dbtLanguageClientManager.getDbtProjectUri(editor.document.uri);
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
      this.previewContentProvider.updatePreviewDiagnostics(this.dbtLanguageClientManager.getDiagnostics());
    });

    context.subscriptions.push(this.previewContentProvider, commandRegistration, providerRegistrations);
  }

  async onDidOpenTextDocument(document: TextDocument): Promise<void> {
    if (!SUPPORTED_LANG_IDS.includes(document.languageId) || document.uri.scheme !== 'file') {
      return;
    }

    await this.dbtLanguageClientManager.ensureClient(document);
  }

  onDeactivate(): Thenable<void> {
    return this.dbtLanguageClientManager.onDeactivate();
  }
}
