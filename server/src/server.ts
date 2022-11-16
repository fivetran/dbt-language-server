import { CustomInitParams, NO_PROJECT_PATH } from 'dbt-language-server-common';
import * as sourceMapSupport from 'source-map-support';
import { createConnection, InitializeError, InitializeParams, InitializeResult, ProposedFeatures, ResponseError } from 'vscode-languageserver/node';
import { DbtCommandExecutor } from './dbt_execution/commands/DbtCommandExecutor';
import { FeatureFinder } from './feature_finder/FeatureFinder';
import { FeatureFinderBase } from './feature_finder/FeatureFinderBase';
import { NoProjectFeatureFinder } from './feature_finder/NoProjectFeatureFinder';
import { Logger } from './Logger';
import { LspServer } from './lsp_server/LspServer';
import { LspServerBase } from './lsp_server/LspServerBase';
import { NoProjectLspServer } from './lsp_server/NoProjectLspServer';

sourceMapSupport.install({ handleUncaughtExceptions: false });

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

connection.onInitialize((params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError> => {
  const workspaceFolder = process.cwd();

  const customInitParams = params.initializationOptions as CustomInitParams;
  Logger.prepareLogger(customInitParams.lspMode === 'dbtProject' ? workspaceFolder : NO_PROJECT_PATH, customInitParams.disableLogger);

  const server = createLspServer(customInitParams, workspaceFolder);
  return server.onInitialize(params);
});

function createLspServer(customInitParams: CustomInitParams, workspaceFolder: string): LspServerBase<FeatureFinderBase> {
  if (customInitParams.lspMode === 'noProject') {
    const noProjectFeatureFinder = new NoProjectFeatureFinder(customInitParams.pythonInfo, new DbtCommandExecutor());
    return new NoProjectLspServer(connection, noProjectFeatureFinder);
  }

  const featureFinder = new FeatureFinder(customInitParams.pythonInfo, new DbtCommandExecutor());
  return new LspServer(connection, featureFinder, workspaceFolder);
}

connection.listen();
