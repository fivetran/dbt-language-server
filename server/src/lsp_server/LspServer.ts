import { CustomInitParams, DbtCompilerType, getStringVersion, SelectedDbtPackage } from 'dbt-language-server-common';
import { Result } from 'neverthrow';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';

import {
  CodeAction,
  CodeActionKind,
  CodeActionParams,
  Command,
  CompletionItem,
  CompletionParams,
  CreateFilesParams,
  DefinitionLink,
  DefinitionParams,
  DeleteFilesParams,
  Diagnostic,
  DidChangeConfigurationNotification,
  DidChangeTextDocumentParams,
  DidChangeWatchedFilesNotification,
  DidChangeWatchedFilesParams,
  DidCreateFilesNotification,
  DidDeleteFilesNotification,
  DidOpenTextDocumentParams,
  DidRenameFilesNotification,
  DidSaveTextDocumentParams,
  Emitter,
  ExecuteCommandParams,
  Hover,
  HoverParams,
  InitializeError,
  InitializeParams,
  InitializeResult,
  Range,
  RenameFilesParams,
  ResponseError,
  SignatureHelp,
  SignatureHelpParams,
  TextDocumentSyncKind,
  TextEdit,
  WillSaveTextDocumentParams,
  _Connection,
} from 'vscode-languageserver';
import { FileOperationFilter } from 'vscode-languageserver-protocol/lib/common/protocol.fileOperations';
import { URI } from 'vscode-uri';
import { BigQueryContext } from '../bigquery/BigQueryContext';
import { DbtProfileCreator, DbtProfileInfo } from '../DbtProfileCreator';
import { DbtProject } from '../DbtProject';
import { DbtRepository } from '../DbtRepository';
import { Dbt, DbtMode } from '../dbt_execution/Dbt';
import { DbtCli } from '../dbt_execution/DbtCli';
import { DbtRpc } from '../dbt_execution/DbtRpc';
import { DbtDefinitionProvider } from '../definition/DbtDefinitionProvider';
import { DiagnosticGenerator } from '../DiagnosticGenerator';
import { DbtDocumentKind } from '../document/DbtDocumentKind';
import { DbtDocumentKindResolver } from '../document/DbtDocumentKindResolver';
import { DbtTextDocument } from '../document/DbtTextDocument';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { FileChangeListener } from '../FileChangeListener';
import { HoverProvider } from '../HoverProvider';
import { JinjaParser } from '../JinjaParser';
import { LogLevel } from '../Logger';
import { ManifestParser } from '../manifest/ManifestParser';
import { ModelCompiler } from '../ModelCompiler';
import { ProcessExecutor } from '../ProcessExecutor';
import { ProgressReporter } from '../ProgressReporter';
import { SignatureHelpProvider } from '../SignatureHelpProvider';
import { DbtProjectStatusSender } from '../status_bar/DbtProjectStatusSender';
import { LspServerBase } from './LspServerBase';

export class LspServer extends LspServerBase<FeatureFinder> {
  sqlToRefCommandName = randomUUID();
  filesFilter: FileOperationFilter[];
  hasConfigurationCapability = false;
  hasDidChangeWatchedFilesCapability = false;
  statusSender: DbtProjectStatusSender;
  openedDocuments = new Map<string, DbtTextDocument>();
  progressReporter: ProgressReporter;
  fileChangeListener: FileChangeListener;
  dbtProfileCreator: DbtProfileCreator;
  manifestParser = new ManifestParser();
  dbtRepository = new DbtRepository();
  dbtDocumentKindResolver = new DbtDocumentKindResolver(this.dbtRepository);
  diagnosticGenerator = new DiagnosticGenerator(this.dbtRepository);
  dbtDefinitionProvider = new DbtDefinitionProvider(this.dbtRepository);
  signatureHelpProvider = new SignatureHelpProvider();
  hoverProvider = new HoverProvider();
  initStart = performance.now();
  onGlobalDbtErrorFixedEmitter = new Emitter<void>();
  dbtProject = new DbtProject('.');

  bigQueryContext = new BigQueryContext();
  dbt?: Dbt;

  constructor(connection: _Connection, featureFinder: FeatureFinder, private workspaceFolder: string) {
    super(connection, featureFinder);
    this.filesFilter = [{ scheme: 'file', pattern: { glob: `${this.workspaceFolder}/**/*`, matches: 'file' } }];

    this.progressReporter = new ProgressReporter(this.connection);
    this.dbtProfileCreator = new DbtProfileCreator(this.dbtProject, path.join(homedir(), '.dbt', 'profiles.yml'));
    this.fileChangeListener = new FileChangeListener(this.workspaceFolder, this.dbtProject, this.manifestParser, this.dbtRepository);
    this.statusSender = new DbtProjectStatusSender(this.notificationSender, this.workspaceFolder, this.featureFinder, this.fileChangeListener);
  }

  onInitialize(params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError> {
    console.log(`Starting server for folder ${this.workspaceFolder}.`);

    this.initializeEvents();

    process.on('uncaughtException', this.onUncaughtException.bind(this));
    process.on('SIGTERM', () => this.onShutdown());
    process.on('SIGINT', () => this.onShutdown());

    this.fileChangeListener.onInit();

    this.initializeNotifications();

    this.dbt = this.createDbt((params.initializationOptions as CustomInitParams).dbtCompiler);

    const { capabilities } = params;

    this.hasConfigurationCapability = Boolean(capabilities.workspace?.configuration);
    this.hasDidChangeWatchedFilesCapability = Boolean(capabilities.workspace?.didChangeWatchedFiles?.dynamicRegistration);
    return {
      capabilities: {
        textDocumentSync: {
          openClose: true,
          change: TextDocumentSyncKind.Incremental,
          willSave: true,
          save: true,
        },
        hoverProvider: true,
        completionProvider: {
          triggerCharacters: ['.', '(', '"', "'"],
        },
        signatureHelpProvider: {
          triggerCharacters: ['(', ',', ')'],
        },
        definitionProvider: true,
        codeActionProvider: true,
        executeCommandProvider: {
          commands: [this.sqlToRefCommandName],
        },
        workspace: {
          fileOperations: {
            didRename: {
              filters: this.filesFilter,
            },
          },
        },
      },
    };
  }

  initializeEvents(): void {
    this.connection.onInitialized(this.onInitialized.bind(this));
    this.connection.onHover(this.onHover.bind(this));
    this.connection.onCompletion(this.onCompletion.bind(this));
    this.connection.onSignatureHelp(this.onSignatureHelp.bind(this));
    this.connection.onDefinition(this.onDefinition.bind(this));

    this.connection.onWillSaveTextDocument(this.onWillSaveTextDocument.bind(this));
    this.connection.onDidSaveTextDocument(this.onDidSaveTextDocument.bind(this));
    this.connection.onDidOpenTextDocument(this.onDidOpenTextDocument.bind(this));
    this.connection.onDidChangeTextDocument(this.onDidChangeTextDocument.bind(this));

    this.connection.onCodeAction(this.onCodeAction.bind(this));
    this.connection.onExecuteCommand(this.onExecuteCommand.bind(this));
    this.connection.onDidChangeWatchedFiles(this.onDidChangeWatchedFiles.bind(this));

    this.connection.onShutdown(this.onShutdown.bind(this));

    this.connection.workspace.onDidCreateFiles(this.onDidCreateFiles.bind(this));
    this.connection.workspace.onDidRenameFiles(this.onDidRenameFiles.bind(this));
    this.connection.workspace.onDidDeleteFiles(this.onDidDeleteFiles.bind(this));
  }

  createDbt(dbtCompiler: DbtCompilerType): Dbt {
    const dbtMode = this.getDbtMode(dbtCompiler);
    console.log(`ModelCompiler mode: ${DbtMode[dbtMode]}.`);

    return dbtMode === DbtMode.DBT_RPC
      ? new DbtRpc(this.featureFinder, this.connection, this.progressReporter, this.fileChangeListener, this.notificationSender)
      : new DbtCli(this.featureFinder, this.connection, this.progressReporter, this.notificationSender);
  }

  getDbtMode(dbtCompiler: DbtCompilerType): DbtMode {
    switch (dbtCompiler) {
      case 'Auto': {
        if (process.platform === 'win32') {
          return DbtMode.CLI;
        }
        const pythonVersion = this.featureFinder.getPythonVersion();
        // https://github.com/dbt-labs/dbt-rpc/issues/85
        if (pythonVersion !== undefined && pythonVersion[0] >= 3 && pythonVersion[1] >= 10) {
          return DbtMode.CLI;
        }
        return process.env['USE_DBT_RPC'] === 'true' ? DbtMode.DBT_RPC : DbtMode.CLI;
      }
      case 'dbt-rpc': {
        return DbtMode.DBT_RPC;
      }
      case 'dbt': {
        return DbtMode.CLI;
      }
      default: {
        return DbtMode.CLI;
      }
    }
  }

  override initializeNotifications(): void {
    super.initializeNotifications();

    this.connection.onNotification('custom/dbtCompile', (uri: string) => this.onDbtCompile(uri));
    this.connection.onNotification('WizardForDbtCore(TM)/resendDiagnostics', (uri: string) => this.onResendDiagnostics(uri));

    this.connection.onRequest('WizardForDbtCore(TM)/getListOfPackages', () => this.featureFinder.packageInfosPromise.get());
    this.connection.onRequest('WizardForDbtCore(TM)/getPackageVersions', (dbtPackage: string) => this.featureFinder.packageVersions(dbtPackage));
    this.connection.onRequest('WizardForDbtCore(TM)/addNewDbtPackage', (dbtPackage: SelectedDbtPackage) => this.onAddNewDbtPackage(dbtPackage));
  }

  async onInitialized(): Promise<void> {
    this.registerClientNotification();

    const profileResult = this.dbtProfileCreator.createDbtProfile();
    const contextInfo = profileResult.match<DbtProfileInfo>(
      s => s,
      e => e,
    );
    const dbtProfileType = profileResult.isOk() ? profileResult.value.type : profileResult.error.type;

    if (profileResult.isErr()) {
      this.showProfileCreationWarning(profileResult.error.message);
    }

    const ubuntuInWslWorks = await this.featureFinder.ubuntuInWslWorks;
    if (!ubuntuInWslWorks) {
      await this.showWslWarning();
    }

    const destinationInitResult = profileResult.isOk()
      ? this.bigQueryContext
          .initialize(profileResult.value, this.dbtRepository, ubuntuInWslWorks, this.dbtProject.findProjectName())
          .then((initResult: Result<void, string>) => (initResult.isErr() ? this.showCreateContextWarning(initResult.error) : undefined))
      : Promise.resolve();

    const prepareDbt = this.dbt?.prepare(dbtProfileType).then(_ => this.statusSender.sendStatus());

    this.dbtRepository
      .manifestParsed()
      .then(() => this.notificationSender.sendLanguageServerManifestParsed())
      .catch(e => console.log(`Manifest was not parsed: ${e instanceof Error ? e.message : String(e)}`));

    await Promise.allSettled([prepareDbt, destinationInitResult]);
    this.compileAndAnalyzeProject().catch(e => console.log(`Error while compiling/analyzing project: ${e instanceof Error ? e.message : String(e)}`));

    const initTime = performance.now() - this.initStart;
    this.logStartupInfo(contextInfo, initTime, ubuntuInWslWorks);

    this.featureFinder
      .runPostInitTasks()
      .catch(e => console.log(`Error while running post init tasks: ${e instanceof Error ? e.message : String(e)}`));
  }

  async compileAndAnalyzeProject(): Promise<void> {
    await this.dbt?.compileProject(this.dbtRepository);
    const analyzeResults = await this.bigQueryContext.analyzeProject();
    const diagnostics: Diagnostic[] = [];
    for (const [uniqueId, result] of analyzeResults.entries()) {
      if (result.isErr()) {
        const model = this.dbtRepository.models.find(m => m.uniqueId === uniqueId);
        if (model) {
          // const rawPath = this.dbtRepository.getModelRawSqlPath(model);
          const { rawSql, compiledSql } = model;
          if (rawSql && compiledSql) {
            diagnostics.push(...this.diagnosticGenerator.getSqlErrorDiagnostics(result.error, rawSql, compiledSql).raw);
          }
        }
      }
    }
    console.log(diagnostics.length);
    [...analyzeResults.entries()]
      .filter(e => e[1].isErr())
      .forEach(e => {
        if (e[1].isErr()) {
          console.log(`${e[0]}: ${e[1].error}`);
        }
      });
  }

  registerClientNotification(): void {
    this.registerManifestWatcher();

    if (this.hasConfigurationCapability) {
      this.connection.client
        .register(DidChangeConfigurationNotification.type, undefined)
        .catch(e => console.log(`Error while registering DidChangeConfiguration notification: ${e instanceof Error ? e.message : String(e)}`));
    }

    const filters = this.filesFilter;
    this.connection.client
      .register(DidCreateFilesNotification.type, { filters })
      .catch(e => console.log(`Error while registering DidCreateFiles notification: ${e instanceof Error ? e.message : String(e)}`));

    this.connection.client
      .register(DidRenameFilesNotification.type, { filters })
      .catch(e => console.log(`Error while registering DidRenameFiles notification: ${e instanceof Error ? e.message : String(e)}`));

    this.connection.client
      .register(DidDeleteFilesNotification.type, { filters })
      .catch(e => console.log(`Error while registering DidDeleteFiles notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  registerManifestWatcher(): void {
    if (this.hasDidChangeWatchedFilesCapability) {
      const targetPath = this.dbtProject.findTargetPath();
      if (!fs.existsSync(targetPath)) {
        fs.mkdirSync(targetPath, { recursive: true });
      }

      this.connection.client
        .register(DidChangeWatchedFilesNotification.type, {
          watchers: [{ globPattern: { baseUri: URI.file(targetPath).toString(), pattern: 'manifest.json' } }],
        })
        .catch(e =>
          console.log(`Error while registering DidChangeWatchedFilesNotification notification: ${e instanceof Error ? e.message : String(e)}`),
        );
    }
  }

  showWarning(message: string): void {
    console.log(message);
    this.connection.window.showWarningMessage(message);
  }

  showProfileCreationWarning(error: string): void {
    this.showWarning(`Dbt profile was not properly configured. ${error}`);
  }

  async showWslWarning(): Promise<void> {
    const command = `wsl --install -d ${FeatureFinder.getWslUbuntuName()}`;
    const result = await this.connection.window.showWarningMessage(
      `Extension requires WSL and ${FeatureFinder.getWslUbuntuName()} to be installed. Please run the following command as Administrator and then restart your computer ([see docs](https://learn.microsoft.com/en-us/windows/wsl/install)): ${command}`,
      { title: 'Run command', id: 'run' },
    );
    if (result?.id === 'run') {
      new ProcessExecutor()
        .execProcess(`powershell -Command "Start-Process cmd -Verb RunAs -ArgumentList '/k ${command}'"`)
        .catch(e => console.log(`Error while installing WSL and Ubuntu: ${e instanceof Error ? e.message : String(e)}`));
    }
  }

  showCreateContextWarning(error: string): void {
    this.showWarning(`Unable to initialize BigQuery. ${error}`);
  }

  logStartupInfo(contextInfo: DbtProfileInfo, initTime: number, ubuntuInWslWorks: boolean): void {
    this.notificationSender.sendTelemetry('log', {
      dbtVersion: getStringVersion(this.featureFinder.versionInfo?.installedVersion),
      pythonPath: this.featureFinder.pythonInfo?.path ?? 'undefined',
      pythonVersion: this.featureFinder.pythonInfo?.version?.join('.') ?? 'undefined',
      initTime: initTime.toString(),
      type: contextInfo.type ?? 'unknown type',
      method: contextInfo.method ?? 'unknown method',
      winWsl: String(process.platform === 'win32' && ubuntuInWslWorks),
    });
  }

  onDbtCompile(uri: string): void {
    this.openedDocuments.get(uri)?.forceRecompile();
  }

  async onResendDiagnostics(uri: string): Promise<void> {
    const document = this.openedDocuments.get(uri);
    await document?.resendDiagnostics();
  }

  onWillSaveTextDocument(params: WillSaveTextDocumentParams): void {
    this.openedDocuments.get(params.textDocument.uri)?.willSaveTextDocument(params.reason);
  }

  async onDidSaveTextDocument(params: DidSaveTextDocumentParams): Promise<void> {
    if (!(await this.isLanguageServerReady())) {
      return;
    }

    const document = this.openedDocuments.get(params.textDocument.uri);
    await document?.didSaveTextDocument(true);
  }

  async onDidOpenTextDocument(params: DidOpenTextDocumentParams): Promise<void> {
    const { uri } = params.textDocument;
    let document = this.openedDocuments.get(uri);

    if (!document) {
      if (!(await this.isLanguageServerReady()) || !this.dbt) {
        return;
      }

      const dbtDocumentKind = this.dbtDocumentKindResolver.getDbtDocumentKind(this.workspaceFolder, uri);
      if (![DbtDocumentKind.MACRO, DbtDocumentKind.MODEL].includes(dbtDocumentKind)) {
        console.log('Not supported dbt document kind');
        return;
      }

      document = new DbtTextDocument(
        params.textDocument,
        dbtDocumentKind,
        this.workspaceFolder,
        this.notificationSender,
        this.progressReporter,
        new ModelCompiler(this.dbt, this.dbtRepository),
        new JinjaParser(),
        this.onGlobalDbtErrorFixedEmitter,
        this.dbtRepository,
        this.dbt,
        this.bigQueryContext,
        this.diagnosticGenerator,
        this.signatureHelpProvider,
        this.hoverProvider,
        this.dbtDefinitionProvider,
      );
      this.openedDocuments.set(uri, document);

      await document.didOpenTextDocument();
    }
  }

  async onDidChangeTextDocument(params: DidChangeTextDocumentParams): Promise<void> {
    if (!(await this.isLanguageServerReady())) {
      return;
    }
    this.openedDocuments.get(params.textDocument.uri)?.didChangeTextDocument(params);
  }

  async isLanguageServerReady(): Promise<boolean> {
    try {
      await this.dbtRepository.manifestParsed();
      return true;
    } catch {
      return false;
    }
  }

  onHover(hoverParams: HoverParams): Hover | null | undefined {
    const document = this.openedDocuments.get(hoverParams.textDocument.uri);
    return document?.onHover(hoverParams);
  }

  async onCompletion(completionParams: CompletionParams): Promise<CompletionItem[] | undefined> {
    const document = this.openedDocuments.get(completionParams.textDocument.uri);
    return document?.onCompletion(completionParams);
  }

  onSignatureHelp(params: SignatureHelpParams): SignatureHelp | undefined {
    const document = this.openedDocuments.get(params.textDocument.uri);
    return document?.onSignatureHelp(params);
  }

  onDefinition(definitionParams: DefinitionParams): DefinitionLink[] | undefined {
    const document = this.openedDocuments.get(definitionParams.textDocument.uri);
    console.log(`onDefinition: ${document ? 'found' : 'not found'}`, LogLevel.Debug);
    const result = document?.onDefinition(definitionParams);
    console.log(`onDefinition result: ${result?.map(d => d.targetUri).join('|') ?? 'empty'}`, LogLevel.Debug);
    return result;
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    this.fileChangeListener.onDidChangeWatchedFiles(params);
  }

  onCodeAction(params: CodeActionParams): CodeAction[] {
    const title = 'Change to ref';
    return params.context.diagnostics
      .filter(d => d.source === 'Wizard for dbt Core (TM)' && (d.data as { replaceText: string } | undefined)?.replaceText)
      .map<CodeAction>(d => ({
        title,
        diagnostics: [d],
        edit: {
          changes: {
            [params.textDocument.uri]: [TextEdit.replace(d.range, (d.data as { replaceText: string }).replaceText)],
          },
        },
        command: Command.create(title, this.sqlToRefCommandName, params.textDocument.uri, d.range),
        kind: CodeActionKind.QuickFix,
      }));
  }

  onExecuteCommand(params: ExecuteCommandParams): void {
    if (params.command === this.sqlToRefCommandName && params.arguments) {
      const textDocument = this.openedDocuments.get(params.arguments[0] as string);
      const range = params.arguments[1] as Range | undefined;
      if (textDocument && range) {
        textDocument.fixInformationDiagnostic(range);
      }
    }
  }

  onAddNewDbtPackage(dbtPackage: SelectedDbtPackage): void {
    this.dbtProject.addNewDbtPackage(dbtPackage.packageName, dbtPackage.version);
    this.dbt?.deps().catch(e => console.log(`Error while running dbt deps: ${e instanceof Error ? e.message : String(e)}`));
  }

  onDidCreateFiles(_params: CreateFilesParams): void {
    this.dbt?.refresh();
  }

  onDidRenameFiles(params: RenameFilesParams): void {
    this.dbt?.refresh();

    for (const document of this.openedDocuments.values()) {
      if (document.currentDbtError) {
        document.forceRecompile();
        return;
      }
    }

    this.disposeOutdatedDocuments(params.files.map(f => f.oldUri));
  }

  onDidDeleteFiles(params: DeleteFilesParams): void {
    this.dbt?.refresh();
    this.disposeOutdatedDocuments(params.files.map(f => f.uri));
  }

  disposeOutdatedDocuments(uris: string[]): void {
    uris.forEach(uri => {
      this.openedDocuments.get(uri)?.dispose();
      this.openedDocuments.delete(uri);
    });
  }

  onShutdown(): void {
    this.dispose();
  }

  dispose(): void {
    console.log('Dispose start...');
    this.dbt?.dispose();
    this.bigQueryContext.dispose();
    this.onGlobalDbtErrorFixedEmitter.dispose();
    console.log('Dispose end.');
  }
}
