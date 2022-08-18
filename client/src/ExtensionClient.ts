import * as fs from 'fs';
import { commands, ExtensionContext, languages, TextDocument, TextEditor, ViewColumn, window, workspace } from 'vscode';
import { ActiveTextEditorHandler } from './ActiveTextEditorHandler';
import { AfterFunctionCompletion } from './commands/AfterFunctionCompletion';
import { CommandManager } from './commands/CommandManager';
import { Compile } from './commands/Compile';
import { InstallDbtAdapters } from './commands/InstallDbtAdapters';
import { InstallLatestDbt } from './commands/InstallLatestDbt';
import { OpenOrCreatePackagesYml } from './commands/OpenOrCreatePackagesYml';
import { Restart } from './commands/Restart';
import { DbtLanguageClientManager } from './DbtLanguageClientManager';
import { OutputChannelProvider } from './OutputChannelProvider';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { TelemetryClient } from './TelemetryClient';

import path = require('path');
import EventEmitter = require('node:events');

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
  commandManager = new CommandManager();
  packageJson?: PackageJson;
  activeTextEditorHandler: ActiveTextEditorHandler;

  constructor(private context: ExtensionContext, manifestParsedEventEmitter: EventEmitter) {
    this.dbtLanguageClientManager = new DbtLanguageClientManager(
      this.previewContentProvider,
      this.outputChannelProvider,
      this.context.asAbsolutePath(path.join('server', 'out', 'server.js')),
      manifestParsedEventEmitter,
      this.statusHandler,
    );
    this.activeTextEditorHandler = new ActiveTextEditorHandler(this.previewContentProvider, this.dbtLanguageClientManager, this.statusHandler);

    this.context.subscriptions.push(this.dbtLanguageClientManager, this.commandManager, this.activeTextEditorHandler);
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
    this.commandManager.register(new Compile(this.dbtLanguageClientManager));
    this.commandManager.register(new AfterFunctionCompletion());
    this.commandManager.register(new InstallLatestDbt(this.dbtLanguageClientManager, this.outputChannelProvider));
    this.commandManager.register(new InstallDbtAdapters(this.dbtLanguageClientManager, this.outputChannelProvider));
    this.commandManager.register(new OpenOrCreatePackagesYml());
    this.commandManager.register(new Restart(this.dbtLanguageClientManager));
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
