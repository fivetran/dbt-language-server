import * as fs from 'node:fs';
import { commands, ExtensionContext, languages, TextDocument, TextEditor, Uri, ViewColumn, window, workspace } from 'vscode';
import { ActiveTextEditorHandler } from './ActiveTextEditorHandler';
import { CommandManager } from './commands/CommandManager';
import { Compile } from './commands/Compile';
import { InstallDbtAdapters } from './commands/InstallDbtAdapters';
import { InstallDbtPackages } from './commands/InstallDbtPackages';
import { InstallLatestDbt } from './commands/InstallLatestDbt';
import { OpenOrCreatePackagesYml } from './commands/OpenOrCreatePackagesYml';
import { Restart } from './commands/Restart';
import { DbtLanguageClientManager } from './DbtLanguageClientManager';
import { log } from './Logger';
import { OutputChannelProvider } from './OutputChannelProvider';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { TelemetryClient } from './TelemetryClient';
import { DBT_PROJECT_YML, isDocumentSupported } from './Utils';

import { EventEmitter } from 'node:events';
import * as path from 'node:path';
import { CreateDbtProject } from './commands/CreateDbtProject/CreateDbtProject';

export interface PackageJson {
  name: string;
  version: string;
  aiKey: string;
}

export class ExtensionClient {
  previewContentProvider = new SqlPreviewContentProvider();
  statusHandler = new StatusHandler();
  dbtLanguageClientManager: DbtLanguageClientManager;
  commandManager = new CommandManager();
  packageJson?: PackageJson;
  activeTextEditorHandler: ActiveTextEditorHandler;

  constructor(private context: ExtensionContext, private outputChannelProvider: OutputChannelProvider, manifestParsedEventEmitter: EventEmitter) {
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

  public async onActivate(): Promise<void> {
    this.context.subscriptions.push(
      workspace.onDidOpenTextDocument(this.onDidOpenTextDocument.bind(this)),
      workspace.onDidChangeWorkspaceFolders(event => {
        for (const folder of event.removed) {
          this.dbtLanguageClientManager.stopClient(folder.uri.fsPath);
        }
      }),

      workspace.onDidChangeTextDocument(e => {
        if (SqlPreviewContentProvider.isPreviewDocument(e.document.uri)) {
          this.dbtLanguageClientManager.applyPreviewDiagnostics();
        }
      }),
    );
    workspace.textDocuments.forEach(t =>
      this.onDidOpenTextDocument(t).catch(e => log(`Error while opening text document ${e instanceof Error ? e.message : String(e)}`)),
    );
    this.registerSqlPreviewContentProvider(this.context);

    this.registerCommands();

    this.parseVersion();

    await this.activateDefaultProject();

    TelemetryClient.activate(this.context, this.packageJson);
    TelemetryClient.sendEvent('activate');
  }

  async activateDefaultProject(): Promise<void> {
    let currentWorkspace = undefined;
    if (workspace.workspaceFolders && workspace.workspaceFolders.length > 0) {
      currentWorkspace = workspace.workspaceFolders.find(f => f.name === workspace.name);
    }

    if (currentWorkspace) {
      const dbtProjectYmlPath = path.join(currentWorkspace.uri.fsPath, DBT_PROJECT_YML);
      const possibleProjectYmlUri = currentWorkspace.uri.with({ path: dbtProjectYmlPath });
      await this.dbtLanguageClientManager.ensureClient(possibleProjectYmlUri);
      if (this.context.globalState.get<boolean>(dbtProjectYmlPath)) {
        await this.context.globalState.update(dbtProjectYmlPath, false);
        await commands.executeCommand('vscode.open', Uri.file(dbtProjectYmlPath));
        await commands.executeCommand('workbench.action.keepEditor');
      }
    }
    await this.dbtLanguageClientManager.ensureNoProjectClient();
  }

  parseVersion(): void {
    const extensionPath = path.join(this.context.extensionPath, 'package.json');
    this.packageJson = JSON.parse(fs.readFileSync(extensionPath, 'utf8')) as PackageJson;
    log(`Wizard for dbt Core (TM) version: ${this.packageJson.version}`);
  }

  registerCommands(): void {
    this.commandManager.register(new Compile(this.dbtLanguageClientManager));
    this.commandManager.register(new CreateDbtProject(this.context.globalState));
    this.commandManager.register(new InstallLatestDbt(this.dbtLanguageClientManager, this.outputChannelProvider));
    this.commandManager.register(new InstallDbtAdapters(this.dbtLanguageClientManager, this.outputChannelProvider));
    this.commandManager.register(new OpenOrCreatePackagesYml());
    this.commandManager.register(new Restart(this.dbtLanguageClientManager));
    this.commandManager.register(new InstallDbtPackages(this.dbtLanguageClientManager));
  }

  registerSqlPreviewContentProvider(context: ExtensionContext): void {
    const providerRegistrations = workspace.registerTextDocumentContentProvider(SqlPreviewContentProvider.SCHEME, this.previewContentProvider);
    const commandRegistration = commands.registerTextEditorCommand('WizardForDbtCore(TM).showQueryPreview', async (editor: TextEditor) => {
      const projectUri = await this.dbtLanguageClientManager.getOuterMostDbtProjectUri(editor.document.uri);
      if (!projectUri) {
        return;
      }
      this.previewContentProvider.changeActiveDocument(editor.document.uri);

      if (window.visibleTextEditors.some(e => SqlPreviewContentProvider.isPreviewDocument(e.document.uri))) {
        return;
      }
      log('Opening Query Preview');

      const doc = await workspace.openTextDocument(SqlPreviewContentProvider.URI);
      await window.showTextDocument(doc, ViewColumn.Beside, false);
      await commands.executeCommand('workbench.action.lockEditorGroup');
      await commands.executeCommand('workbench.action.focusPreviousGroup');
      await languages.setTextDocumentLanguage(doc, 'sql');
      this.dbtLanguageClientManager.applyPreviewDiagnostics();
    });

    context.subscriptions.push(this.previewContentProvider, commandRegistration, providerRegistrations);
  }

  async onDidOpenTextDocument(document: TextDocument): Promise<void> {
    if (isDocumentSupported(document)) {
      await this.dbtLanguageClientManager.ensureClient(document.uri);
    }
  }

  onDeactivate(): Thenable<void> {
    return this.dbtLanguageClientManager.onDeactivate();
  }
}
