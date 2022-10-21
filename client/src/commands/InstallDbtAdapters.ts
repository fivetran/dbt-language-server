import { commands, window } from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { DBT_ADAPTERS } from '../Utils';
import { Command } from './CommandManager';

export class InstallDbtAdapters implements Command {
  readonly id = 'WizardForDbtCore(TM).installDbtAdapters';

  constructor(private dbtLanguageClientManager: DbtLanguageClientManager, private outputChannelProvider: OutputChannelProvider) {}

  async execute(projectPath?: string): Promise<void> {
    const client =
      projectPath === undefined
        ? await this.dbtLanguageClientManager.getClientForActiveDocument()
        : this.dbtLanguageClientManager.getClientByPath(projectPath);
    if (client) {
      const dbtAdapter = await window.showQuickPick(DBT_ADAPTERS, {
        placeHolder: 'Select dbt adapter to install',
      });
      if (dbtAdapter !== undefined) {
        client.sendNotification('WizardForDbtCore(TM)/installDbtAdapter', dbtAdapter);
        this.outputChannelProvider.getInstallDbtAdaptersChannel().show();
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }
    }
  }
}
