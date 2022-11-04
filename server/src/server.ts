import { CustomInitParams } from 'dbt-language-server-common';
import * as sourceMapSupport from 'source-map-support';
import { createConnection, InitializeError, InitializeParams, InitializeResult, ProposedFeatures, ResponseError } from 'vscode-languageserver/node';
import { DbtCommandExecutor } from './dbt_execution/commands/DbtCommandExecutor';
import { FeatureFinder } from './FeatureFinder';
import { LspServer } from './LspServer';

sourceMapSupport.install({ handleUncaughtExceptions: false });

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

connection.onInitialize((params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError> => {
  const customInitParams = params.initializationOptions as CustomInitParams;
  const featureFinder = new FeatureFinder(customInitParams.pythonInfo, new DbtCommandExecutor());

  const server = new LspServer(connection, featureFinder);
  return server.onInitialize(params);
});
connection.listen();
