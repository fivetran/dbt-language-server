import { window } from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { log } from '../Logger';
import { Command } from './CommandManager';

export class GoogleAuth implements Command {
  readonly id = 'WizardForDbtCore(TM).googleAuth';

  constructor(private dbtLanguageClientManager: DbtLanguageClientManager) {}

  async execute(): Promise<void> {
    const client = await this.dbtLanguageClientManager.getClientForActiveDocument();
    if (client) {
      client.sendNotification('custom/googleAuth');
    } else {
      window.showWarningMessage('First, open the model from the dbt project.').then(undefined, e => {
        log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`);
      });
    }
  }
}
