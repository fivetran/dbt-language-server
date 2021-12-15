import { ExtensionContext } from 'vscode';
import { ExtensionClient } from './ExtensionClient';

let extensionClient: ExtensionClient;
export async function activate(context: ExtensionContext): Promise<void> {
  extensionClient = new ExtensionClient(context);
  await extensionClient.onActivate();
}

// This method is called when extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  return extensionClient.onDeactivate();
}
