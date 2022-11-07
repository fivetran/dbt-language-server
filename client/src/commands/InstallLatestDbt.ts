import { commands, window } from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { log } from '../Logger';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { Command } from './CommandManager';
import { NoProjectCommand } from './NoProjectCommand';

export class InstallLatestDbt extends NoProjectCommand implements Command {
  readonly id = 'WizardForDbtCore(TM).installLatestDbt';

  constructor(dbtLanguageClientManager: DbtLanguageClientManager, private outputChannelProvider: OutputChannelProvider) {
    super(dbtLanguageClientManager);
  }

  async execute(projectPath?: string, skipDialog?: boolean): Promise<void> {
    const client = await this.getClient(projectPath);
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
