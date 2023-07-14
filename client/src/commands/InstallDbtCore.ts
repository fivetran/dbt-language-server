import { QuickPickItem, commands, window } from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { log } from '../Logger';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { DbtWizardQuickPick } from '../QuickPick';
import { Command } from './CommandManager';
import { NoProjectCommand } from './NoProjectCommand';

export class InstallDbtCore extends NoProjectCommand implements Command {
  readonly id = 'WizardForDbtCore(TM).installDbtCore';

  constructor(
    dbtLanguageClientManager: DbtLanguageClientManager,
    private outputChannelProvider: OutputChannelProvider,
  ) {
    super(dbtLanguageClientManager);
  }

  async execute(projectPath?: string, skipDialog?: boolean): Promise<void> {
    const client = await this.getClient(projectPath);
    if (client) {
      const versionsPromise = client.sendRequest<string[]>('WizardForDbtCore(TM)/getDbtCoreInstallVersions');
      const version = await this.getVersion(versionsPromise);

      if (version) {
        const answer =
          skipDialog === undefined
            ? await window.showInformationMessage(`Are you sure you want to install dbt-core ${version}?`, { modal: true }, 'Yes', 'No')
            : 'Yes';
        if (answer === 'Yes') {
          client.sendNotification('WizardForDbtCore(TM)/installDbtCore', version);
          this.outputChannelProvider.getInstallDbtCoreChannel().show();
          await commands.executeCommand('workbench.action.focusActiveEditorGroup');
        }
      }
    } else {
      window.showWarningMessage('First, open the model from the dbt project.').then(undefined, e => {
        log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`);
      });
    }
  }

  private async getVersion(versionsPromise: Promise<string[]>): Promise<string | undefined> {
    return DbtWizardQuickPick.showQuickPick(
      {
        buttons: [],
        placeholder: 'Filter by version, e.g. 1.4',
        title: 'Select dbt Core version to install',
      },
      versionsPromise.then(v => this.createVersionItems(v)),
      () => {
        // do nothing
      },
    );
  }

  createVersionItems(versions: string[]): QuickPickItem[] {
    return versions.sort((a, b) => b.localeCompare(a)).map(label => ({ label }));
  }
}
