import { CustomInitParams, DbtCompilerType, NO_PROJECT_PATH } from 'dbt-language-server-common';
import { homedir } from 'node:os';
import * as sourceMapSupport from 'source-map-support';
import { createConnection, InitializeError, InitializeParams, InitializeResult, ProposedFeatures, ResponseError } from 'vscode-languageserver/node';
import { URI } from 'vscode-uri';
import { z } from 'zod';
import { DbtProfileCreator } from './DbtProfileCreator';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { DbtCommandExecutor } from './dbt_execution/commands/DbtCommandExecutor';
import { Dbt, DbtMode } from './dbt_execution/Dbt';
import { DbtCli } from './dbt_execution/DbtCli';
import { DbtRpc } from './dbt_execution/DbtRpc';
import { DbtDefinitionProvider } from './definition/DbtDefinitionProvider';
import { SqlDefinitionProvider } from './definition/SqlDefinitionProvider';
import { DestinationContext } from './DestinationContext';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { DbtDocumentKindResolver } from './document/DbtDocumentKindResolver';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FeatureFinder } from './feature_finder/FeatureFinder';
import { FeatureFinderBase } from './feature_finder/FeatureFinderBase';
import { NoProjectFeatureFinder } from './feature_finder/NoProjectFeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { HoverProvider } from './HoverProvider';
import { Logger } from './Logger';
import { LspServer } from './lsp_server/LspServer';
import { LspServerBase } from './lsp_server/LspServerBase';
import { NoProjectLspServer } from './lsp_server/NoProjectLspServer';
import { ManifestParser } from './manifest/ManifestParser';
import { NotificationSender } from './NotificationSender';
import { ProgressReporter } from './ProgressReporter';
import { ProjectChangeListener } from './ProjectChangeListener';
import { SignatureHelpProvider } from './SignatureHelpProvider';
import { DbtProjectStatusSender } from './status_bar/DbtProjectStatusSender';
import path = require('path');

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
  const featureFinder = new FeatureFinder(customInitParams.pythonInfo, new DbtCommandExecutor());

  const progressReporter = new ProgressReporter(connection);
  const dbtProject = new DbtProject('.');
  const manifestParser = new ManifestParser();
  const dbtRepository = new DbtRepository(workspaceFolder, featureFinder.getGlobalProjectPath());
  const fileChangeListener = new FileChangeListener(workspaceFolder, dbtProject, manifestParser, dbtRepository);
  const dbtProfileCreator = new DbtProfileCreator(dbtProject, path.join(homedir(), '.dbt', 'profiles.yml'));
  const statusSender = new DbtProjectStatusSender(notificationSender, workspaceFolder, featureFinder, fileChangeListener);
  const dbt = createDbt(customInitParams.dbtCompiler, featureFinder, progressReporter, fileChangeListener, notificationSender);
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
  );

  return new LspServer(
    connection,
    notificationSender,
    featureFinder,
    workspaceFolder,
    dbt,
    progressReporter,
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
  progressReporter: ProgressReporter,
  fileChangeListener: FileChangeListener,
  notificationSender: NotificationSender,
): Dbt {
  const dbtMode = getDbtMode(dbtCompiler, featureFinder);
  console.log(`ModelCompiler mode: ${DbtMode[dbtMode]}.`);

  return dbtMode === DbtMode.DBT_RPC
    ? new DbtRpc(featureFinder, connection, progressReporter, fileChangeListener, notificationSender)
    : new DbtCli(featureFinder, connection, progressReporter, notificationSender);
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
