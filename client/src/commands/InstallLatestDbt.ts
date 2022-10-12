import { commands, window } from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { log } from '../Logger';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { Command } from './CommandManager';

export class InstallLatestDbt implements Command {
  readonly id = 'WizardForDbtCore(TM).installLatestDbt';

  constructor(private dbtLanguageClientManager: DbtLanguageClientManager, private outputChannelProvider: OutputChannelProvider) {}

  async execute(projectPath?: string, skipDialog?: boolean): Promise<void> {
    const client =
      projectPath === undefined
        ? await this.dbtLanguageClientManager.getClientForActiveDocument()
        : this.dbtLanguageClientManager.getClientByPath(projectPath);
    if (client) {
      const answer =
        skipDialog === undefined
          ? await window.showInformationMessage('Are you sure you want to install the latest version of dbt?', { modal: true }, 'Yes', 'No')
          : 'Yes';
      if (answer === 'Yes') {
        client.sendNotification('WizardForDbtCore(TM)/installLatestDbt');
        this.outputChannelProvider.getInstallLatestDbtChannel().show();
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }
    } else {
      window.showWarningMessage('First, open the model from the dbt project.').then(undefined, e => {
        log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`);
      });
    }
  }
}
