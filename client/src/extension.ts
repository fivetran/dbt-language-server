import { ExtensionApi } from 'dbt-language-server-common/src/api/ExtensionApi';
import { ExtensionContext } from 'vscode';
import { ExtensionClient } from './ExtensionClient';
import EventEmitter = require('node:events');

let extensionClient: ExtensionClient;

export function activate(context: ExtensionContext): ExtensionApi {
  const manifestParsedEventEmitter = new EventEmitter();

  extensionClient = new ExtensionClient(context, manifestParsedEventEmitter);
  extensionClient.onActivate();

  return { manifestParsedEventEmitter };
}

// This method is called when extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  return extensionClient.onDeactivate();
}
