import { CustomInitParams, NO_PROJECT_PATH } from 'dbt-language-server-common';
import * as sourceMapSupport from 'source-map-support';
import { InitializeError, InitializeParams, InitializeResult, ProposedFeatures, ResponseError, createConnection } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { z } from 'zod';
import { DbtProfileCreator } from './DbtProfileCreator';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { DestinationContext } from './DestinationContext';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { FileChangeListener } from './FileChangeListener';
import { HoverProvider } from './HoverProvider';
import { Logger } from './Logger';
import { MacroCompilationServer } from './MacroCompilationServer';
import { ModelProgressReporter } from './ModelProgressReporter';
import { NotificationSender } from './NotificationSender';
import { ProjectChangeListener } from './ProjectChangeListener';
import { ProjectProgressReporter } from './ProjectProgressReporter';
import { SignatureHelpProvider } from './SignatureHelpProvider';
import { DbtCli } from './dbt_execution/DbtCli';
import { DbtCommandExecutor } from './dbt_execution/DbtCommandExecutor';
import { DbtDefinitionProvider } from './definition/DbtDefinitionProvider';
import { SqlDefinitionProvider } from './definition/SqlDefinitionProvider';
import { DbtDocumentKindResolver } from './document/DbtDocumentKindResolver';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FeatureFinder } from './feature_finder/FeatureFinder';
import { FeatureFinderBase } from './feature_finder/FeatureFinderBase';
import { NoProjectFeatureFinder } from './feature_finder/NoProjectFeatureFinder';
import { LspServer } from './lsp_server/LspServer';
import { LspServerBase } from './lsp_server/LspServerBase';
import { NoProjectLspServer } from './lsp_server/NoProjectLspServer';
import { ManifestParser } from './manifest/ManifestParser';
import { DbtProjectStatusSender } from './status_bar/DbtProjectStatusSender';
import path = require('node:path');

sourceMapSupport.install({ handleUncaughtExceptions: false });

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);
const customInitParamsSchema = z.object({
  pythonInfo: z.object({
    path: z.string(),
    version: z.optional(z.array(z.string())),
  }),
  lspMode: z.union([z.literal('dbtProject'), z.literal('noProject')]),
  enableEntireProjectAnalysis: z.boolean(),
  disableLogger: z.optional(z.boolean()),
  profilesDir: z.optional(z.string()),
});

connection.onInitialize((params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError> => {
  const workspaceFolder = params.workspaceFolders?.length === 1 ? URI.parse(params.workspaceFolders[0].uri).fsPath : process.cwd();

  const customInitParams: CustomInitParams = customInitParamsSchema.parse(params.initializationOptions);
  Logger.prepareLogger(customInitParams.lspMode === 'dbtProject' ? workspaceFolder : NO_PROJECT_PATH, customInitParams.disableLogger);

  const server = createLspServer(customInitParams, workspaceFolder);
  return server.onInitialize(params);
});

function createLspServer(customInitParams: CustomInitParams, workspaceFolder: string): LspServerBase<FeatureFinderBase> {
  const notificationSender = new NotificationSender(connection);
  const dbtCommandExecutor = new DbtCommandExecutor(customInitParams.pythonInfo.path, path.resolve(__dirname, '..', 'dbt_core.py'));
  if (customInitParams.lspMode === 'noProject') {
    const noProjectFeatureFinder = new NoProjectFeatureFinder(customInitParams.pythonInfo, dbtCommandExecutor);
    return new NoProjectLspServer(connection, notificationSender, noProjectFeatureFinder);
  }
  return createLspServerForProject(customInitParams, workspaceFolder, notificationSender, dbtCommandExecutor);
}

function createLspServerForProject(
  customInitParams: CustomInitParams,
  workspaceFolder: string,
  notificationSender: NotificationSender,
  dbtCommandExecutor: DbtCommandExecutor,
): LspServerBase<FeatureFinderBase> {
  const featureFinder = new FeatureFinder(customInitParams.pythonInfo, dbtCommandExecutor, customInitParams.profilesDir);

  const modelProgressReporter = new ModelProgressReporter(connection);
  const projectProgressReporter = new ProjectProgressReporter(connection);
  const dbtProject = new DbtProject('.');
  const manifestParser = new ManifestParser();
  const dbtRepository = new DbtRepository(workspaceFolder, featureFinder.getGlobalProjectPath());
  dbtRepository
    .manifestParsed()
    .then(() => notificationSender.sendLanguageServerManifestParsed())
    .catch(e => console.log(`Manifest was not parsed: ${e instanceof Error ? e.message : String(e)}`));

  const fileChangeListener = new FileChangeListener(dbtProject, manifestParser, dbtRepository);
  const dbtProfileCreator = new DbtProfileCreator(dbtProject, featureFinder.getProfilesYmlPath());
  const statusSender = new DbtProjectStatusSender(notificationSender, dbtRepository, featureFinder, fileChangeListener, dbtProject.findProfileName());
  const destinationContext = new DestinationContext();
  const macroCompilationServer = new MacroCompilationServer(destinationContext, dbtRepository);
  const dbt = new DbtCli(featureFinder, connection, modelProgressReporter, notificationSender, macroCompilationServer, dbtCommandExecutor);
  const dbtDocumentKindResolver = new DbtDocumentKindResolver(dbtRepository);
  const diagnosticGenerator = new DiagnosticGenerator(dbtRepository);
  const dbtDefinitionProvider = new DbtDefinitionProvider(dbtRepository);
  const sqlDefinitionProvider = new SqlDefinitionProvider(dbtRepository);
  const signatureHelpProvider = new SignatureHelpProvider();
  const hoverProvider = new HoverProvider();
  const openedDocuments = new Map<string, DbtTextDocument>();

  const projectChangeListener = new ProjectChangeListener(
    openedDocuments,
    destinationContext,
    dbtRepository,
    diagnosticGenerator,
    notificationSender,
    dbt,
    customInitParams.enableEntireProjectAnalysis,
    fileChangeListener,
    projectProgressReporter,
  );

  return new LspServer(
    connection,
    notificationSender,
    featureFinder,
    dbt,
    modelProgressReporter,
    dbtProject,
    dbtRepository,
    fileChangeListener,
    dbtProfileCreator,
    statusSender,
    dbtDocumentKindResolver,
    diagnosticGenerator,
    dbtDefinitionProvider,
    sqlDefinitionProvider,
    signatureHelpProvider,
    hoverProvider,
    destinationContext,
    openedDocuments,
    projectChangeListener,
  );
}

connection.listen();
