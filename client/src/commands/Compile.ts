import { commands, window } from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { Command } from './CommandManager';

export class Compile implements Command {
  readonly id = 'dbtWizard.compile';

  constructor(private dbtLanguageClientManager: DbtLanguageClientManager) {}

  async execute(): Promise<void> {
    const client = await this.dbtLanguageClientManager.getClientForActiveDocument();
    if (client) {
      client.sendNotification('custom/dbtCompile', window.activeTextEditor?.document.uri.toString());
      await commands.executeCommand('dbtWizard.showQueryPreview');
    }
  }
}
