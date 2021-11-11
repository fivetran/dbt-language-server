import { ExtensionContext } from 'vscode';
import { LspClient } from './LspClient';

let lspClient: LspClient;
export function activate(context: ExtensionContext): void {
  lspClient = new LspClient(context);
  lspClient.onActivate();
}

// This method is called when extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  return lspClient.onDeactivate();
}
