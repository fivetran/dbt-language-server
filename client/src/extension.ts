import { EventEmitter } from 'node:events';
import { ExtensionContext } from 'vscode';
import { ExtensionApi } from './ExtensionApi';
import { ExtensionClient } from './ExtensionClient';
import { log } from './Logger';
import { OutputChannelProvider } from './OutputChannelProvider';

export const outputChannelProvider = new OutputChannelProvider();
export let api: ExtensionApi;

let extensionClient: ExtensionClient;
// ts-unused-exports:disable-next-line
export function activate(context: ExtensionContext): ExtensionApi {
  const manifestParsedEventEmitter = new EventEmitter();

  extensionClient = new ExtensionClient(context, outputChannelProvider, manifestParsedEventEmitter);
  extensionClient.onActivate().catch(e => log(`Error during onActivate: ${e instanceof Error ? e.message : String(e)}`));

  api = { manifestParsedEventEmitter, statusHandler: extensionClient.statusHandler };
  return api;
}

// ts-unused-exports:disable-next-line
export function deactivate(): Thenable<void> | undefined {
  log('Deactivating extension');
  return extensionClient.onDeactivate();
}
