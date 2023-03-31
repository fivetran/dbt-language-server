import { CustomInitParams, DbtCompilerType, NO_PROJECT_PATH } from 'dbt-language-server-common';
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
import { ModelProgressReporter } from './ModelProgressReporter';
import { NotificationSender } from './NotificationSender';
import { ProjectChangeListener } from './ProjectChangeListener';
import { ProjectProgressReporter } from './ProjectProgressReporter';
import { SignatureHelpProvider } from './SignatureHelpProvider';
import { Dbt, DbtMode } from './dbt_execution/Dbt';
import { DbtCli } from './dbt_execution/DbtCli';
import { DbtRpc } from './dbt_execution/DbtRpc';
import { DbtCommandExecutor } from './dbt_execution/commands/DbtCommandExecutor';
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

sourceMapSupport.install({ handleUncaughtExceptions: false });

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);
const customInitParamsSchema = z.object({
  pythonInfo: z.optional(
    z.object({
      path: z.string(),
      version: z.optional(z.array(z.string())),
    }),
  ),
  dbtCompiler: z.union([z.literal('Auto'), z.literal('dbt-rpc'), z.literal('dbt')]),
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
  if (customInitParams.lspMode === 'noProject') {
    const noProjectFeatureFinder = new NoProjectFeatureFinder(customInitParams.pythonInfo, new DbtCommandExecutor());
    return new NoProjectLspServer(connection, notificationSender, noProjectFeatureFinder);
  }
  return createLspServerForProject(customInitParams, workspaceFolder, notificationSender);
}

function createLspServerForProject(
  customInitParams: CustomInitParams,
  workspaceFolder: string,
  notificationSender: NotificationSender,
): LspServerBase<FeatureFinderBase> {
  const featureFinder = new FeatureFinder(customInitParams.pythonInfo, new DbtCommandExecutor(), customInitParams.profilesDir);

  const modelProgressReporter = new ModelProgressReporter(connection);
  const projectProgressReporter = new ProjectProgressReporter(connection);
  const dbtProject = new DbtProject('.');
  const manifestParser = new ManifestParser();
  const dbtRepository = new DbtRepository(workspaceFolder, featureFinder.getGlobalProjectPath());
  const fileChangeListener = new FileChangeListener(workspaceFolder, dbtProject, manifestParser, dbtRepository);
  const dbtProfileCreator = new DbtProfileCreator(dbtProject, featureFinder.getProfilesYmlPath());
  const statusSender = new DbtProjectStatusSender(notificationSender, workspaceFolder, featureFinder, fileChangeListener);
  const dbt = createDbt(customInitParams.dbtCompiler, featureFinder, modelProgressReporter, fileChangeListener, notificationSender);
  const dbtDocumentKindResolver = new DbtDocumentKindResolver(dbtRepository);
  const diagnosticGenerator = new DiagnosticGenerator(dbtRepository);
  const dbtDefinitionProvider = new DbtDefinitionProvider(dbtRepository);
  const sqlDefinitionProvider = new SqlDefinitionProvider(dbtRepository);
  const signatureHelpProvider = new SignatureHelpProvider();
  const hoverProvider = new HoverProvider();
  const destinationContext = new DestinationContext();
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
    workspaceFolder,
  );

  return new LspServer(
    connection,
    notificationSender,
    featureFinder,
    workspaceFolder,
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

function createDbt(
  dbtCompiler: DbtCompilerType,
  featureFinder: FeatureFinder,
  modelProgressReporter: ModelProgressReporter,
  fileChangeListener: FileChangeListener,
  notificationSender: NotificationSender,
): Dbt {
  const dbtMode = getDbtMode(dbtCompiler, featureFinder);
  console.log(`ModelCompiler mode: ${DbtMode[dbtMode]}.`);

  return dbtMode === DbtMode.DBT_RPC
    ? new DbtRpc(featureFinder, connection, modelProgressReporter, fileChangeListener, notificationSender)
    : new DbtCli(featureFinder, connection, modelProgressReporter, notificationSender);
}

function getDbtMode(dbtCompiler: DbtCompilerType, featureFinder: FeatureFinder): DbtMode {
  switch (dbtCompiler) {
    case 'Auto': {
      if (process.platform === 'win32') {
        return DbtMode.CLI;
      }
      const pythonVersion = featureFinder.getPythonVersion();
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

connection.listen();
