import { commands, window } from 'vscode';
import { DBT_ADAPTERS } from '../DbtAdapters';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { Command } from './CommandManager';

export class InstallDbtAdapters implements Command {
  readonly id = 'dbtWizard.installDbtAdapters';

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

      client.sendNotification('dbtWizard/installDbtAdapter', dbtAdapter);
      this.outputChannelProvider.getInstallDbtAdaptersChannel().show();
      await commands.executeCommand('workbench.action.focusActiveEditorGroup');
    }
  }
}
