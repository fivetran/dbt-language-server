import { EventEmitter } from 'node:events';
import { ExtensionContext } from 'vscode';
import { ExtensionApi } from './ExtensionApi';
import { ExtensionClient } from './ExtensionClient';
import { log } from './Logger';
import { OutputChannelProvider } from './OutputChannelProvider';

export const outputChannelProvider = new OutputChannelProvider();
let extensionClient: ExtensionClient;

export function activate(context: ExtensionContext): ExtensionApi {
  const manifestParsedEventEmitter = new EventEmitter();

  extensionClient = new ExtensionClient(context, outputChannelProvider, manifestParsedEventEmitter);
  extensionClient.onActivate().catch(e => log(`Error during onActivate: ${e instanceof Error ? e.message : String(e)}`));

  return { manifestParsedEventEmitter, statusHandler: extensionClient.statusHandler };
}

// This method is called when extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  log('Deactivating extension');
  return extensionClient.onDeactivate();
}
