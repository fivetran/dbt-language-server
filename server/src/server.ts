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
import { JinjaParser } from './JinjaParser';
import { Logger } from './Logger';
import { MacroCompilationServer } from './MacroCompilationServer';
import { ModelProgressReporter } from './ModelProgressReporter';
import { NotificationSender } from './NotificationSender';
import { ProjectAnalyzeResults } from './ProjectAnalyzeResults';
import { ProjectChangeListener } from './ProjectChangeListener';
import { ProjectProgressReporter } from './ProjectProgressReporter';
import { SignatureHelpProvider } from './SignatureHelpProvider';
import { DbtCli } from './dbt_execution/DbtCli';
import { DbtCommandExecutor } from './dbt_execution/DbtCommandExecutor';
import { DbtDefinitionProvider } from './definition/DbtDefinitionProvider';
import { DefinitionProvider } from './definition/DefinitionProvider';
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
import { replaceVsCodeEnvVariables } from './utils/Utils';
import path = require('node:path');
import dotenv = require('dotenv');

sourceMapSupport.install({ handleUncaughtExceptions: false });

const connection = createConnection(ProposedFeatures.all);
const customInitParamsSchema = z.object({
  pythonInfo: z.object({
    path: z.string(),
    version: z.optional(z.array(z.string())),
    dotEnvFile: z.optional(z.string()),
  }),
  lspMode: z.union([z.literal('dbtProject'), z.literal('noProject')]),
  enableSnowflakeSyntaxCheck: z.boolean(),
  disableLogger: z.optional(z.boolean()),
  profilesDir: z.optional(z.string()),
});

connection.onInitialize((params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError> => {
  const workspaceFolder = params.workspaceFolders?.length === 1 ? URI.parse(params.workspaceFolders[0].uri).fsPath : process.cwd();

  // This can happen when LSP is used for other editors e.g. helix
  if (workspaceFolder !== process.cwd()) {
    process.chdir(workspaceFolder);
  }

  Logger.prepareLogger(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    params.initializationOptions.lspMode === 'dbtProject' ? workspaceFolder : NO_PROJECT_PATH,
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    Boolean(params.initializationOptions.disableLogger),
  );
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  console.log(`onInitialize: ${params.initializationOptions.pythonInfo.dotEnvFile}`);
  const customInitParams: CustomInitParams = resolveInitializationOptions(params.initializationOptions, workspaceFolder);

  readAndSaveDotEnv(customInitParams.pythonInfo.dotEnvFile);

  const server = createLspServer(customInitParams, workspaceFolder);
  return server.onInitialize(params);
});

function createLspServer(customInitParams: CustomInitParams, workspaceFolder: string): LspServerBase<FeatureFinderBase> {
  const notificationSender = new NotificationSender(connection);
  const dbtCommandExecutor = new DbtCommandExecutor(customInitParams.pythonInfo.path, `"${path.resolve(__dirname, '..', 'python', 'script.py')}"`);
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
  const destinationContext = new DestinationContext(customInitParams.enableSnowflakeSyntaxCheck);
  const macroCompilationServer = new MacroCompilationServer(destinationContext, dbtRepository);
  const dbt = new DbtCli(featureFinder, connection, modelProgressReporter, notificationSender, macroCompilationServer, dbtCommandExecutor);
  const dbtDocumentKindResolver = new DbtDocumentKindResolver(dbtRepository);
  const diagnosticGenerator = new DiagnosticGenerator(dbtRepository);
  const jinjaParser = new JinjaParser();
  const projectAnalyzeResults = new ProjectAnalyzeResults(dbtRepository);
  const sqlDefinitionProvider = new SqlDefinitionProvider(dbtRepository, projectAnalyzeResults);
  const dbtDefinitionProvider = new DbtDefinitionProvider(dbtRepository);
  const definitionProvider = new DefinitionProvider(jinjaParser, sqlDefinitionProvider, dbtDefinitionProvider);
  const signatureHelpProvider = new SignatureHelpProvider();
  const hoverProvider = new HoverProvider(projectAnalyzeResults);
  const openedDocuments = new Map<string, DbtTextDocument>();

  const projectChangeListener = new ProjectChangeListener(
    openedDocuments,
    destinationContext,
    dbtRepository,
    diagnosticGenerator,
    notificationSender,
    dbt,
    fileChangeListener,
    projectProgressReporter,
    macroCompilationServer,
    projectAnalyzeResults,
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
    jinjaParser,
    definitionProvider,
    signatureHelpProvider,
    hoverProvider,
    destinationContext,
    openedDocuments,
    projectChangeListener,
    customInitParams.enableSnowflakeSyntaxCheck,
    projectAnalyzeResults,
  );
}

/** Reads .env file from cwd and from @param dotEnvFilePath and then saves variables from it to process.env */
function readAndSaveDotEnv(dotEnvFilePath: string | undefined): void {
  dotenv.config();
  if (dotEnvFilePath) {
    dotenv.config({ path: dotEnvFilePath });
  }
}

function resolveSettingsVariables(name: string, workspaceFolder: string): string {
  return replaceVsCodeEnvVariables(name).replaceAll('${workspaceFolder}', workspaceFolder).replaceAll('${fileWorkspaceFolder}', workspaceFolder);
}

function resolveInitializationOptions(initOptions: unknown, workspaceFolder: string): CustomInitParams {
  const result = customInitParamsSchema.parse(initOptions);
  console.log(`resolveInitializationOptions: ${JSON.stringify(result)}`);
  result.pythonInfo.path = path.normalize(resolveSettingsVariables(result.pythonInfo.path, workspaceFolder));
  console.log(`resolveInitializationOptions: ${result.pythonInfo.path}`);
  result.pythonInfo.dotEnvFile = result.pythonInfo.dotEnvFile
    ? path.normalize(resolveSettingsVariables(result.pythonInfo.dotEnvFile, workspaceFolder))
    : undefined;
  console.log(`resolveInitializationOptions: ${result.pythonInfo.dotEnvFile}`);
  return result;
}

connection.listen();
