import { ExtensionContext } from 'vscode';
import { LspClient } from './LspClient';

let lspClient: LspClient;
export async function activate(context: ExtensionContext): Promise<void> {
  lspClient = new LspClient(context);
  await lspClient.onActivate();
}

// This method is called when extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  return lspClient.onDeactivate();
}
