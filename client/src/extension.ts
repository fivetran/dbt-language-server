import { ExtensionContext } from 'vscode';
import { ExtensionClient } from './ExtensionClient';

let extensionClient: ExtensionClient;
export function activate(context: ExtensionContext): void {
  extensionClient = new ExtensionClient(context);
  extensionClient.onActivate();
}

// This method is called when extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  return extensionClient.onDeactivate();
}
