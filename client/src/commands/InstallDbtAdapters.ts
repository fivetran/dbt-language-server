import { QuickInputButtons, QuickPickItem, commands } from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { DbtWizardQuickPick } from '../QuickPick';
import { DBT_ADAPTERS } from '../Utils';
import { Command } from './CommandManager';
import { NoProjectCommand } from './NoProjectCommand';

export class InstallDbtAdapters extends NoProjectCommand implements Command {
  readonly id = 'WizardForDbtCore(TM).installDbtAdapters';

  constructor(
    dbtLanguageClientManager: DbtLanguageClientManager,
    private outputChannelProvider: OutputChannelProvider,
  ) {
    super(dbtLanguageClientManager);
  }

  async execute(projectPath?: string): Promise<void> {
    const client = await this.getClient(projectPath);

    if (client) {
      let adapterVersion = undefined;
      let adapterName = undefined;
      let backPressed = false;
      do {
        backPressed = false;
        adapterName = await this.getAdapter();

        if (adapterName !== undefined) {
          try {
            const versionsPromise = client.sendRequest<string[]>('WizardForDbtCore(TM)/getDbtAdapterVersions', adapterName);
            adapterVersion = await this.getVersion(adapterName, versionsPromise);
          } catch (e) {
            backPressed = e === QuickInputButtons.Back;
          }
        }
      } while (backPressed);

      if (adapterName && adapterVersion) {
        client.sendNotification('WizardForDbtCore(TM)/installDbtAdapter', { name: adapterName, version: adapterVersion });
        this.outputChannelProvider.getInstallDbtAdaptersChannel().show();
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }
    }
  }

  private async getAdapter(): Promise<string | undefined> {
    return DbtWizardQuickPick.showQuickPick(
      {
        buttons: [],
        placeholder: 'Filter by name, e.g. salesforce',
        title: 'Select dbt adapter to install',
      },
      Promise.resolve(DBT_ADAPTERS.map(label => ({ label }))),
      async () => {
        // do nothing
      },
    );
  }

  private async getVersion(dbtAdapter: string, versionsPromise: Promise<string[]>): Promise<string | undefined> {
    return DbtWizardQuickPick.showQuickPick(
      {
        buttons: [QuickInputButtons.Back],
        placeholder: 'Filter by version, e.g. 1.4',
        title: `Select the ${dbtAdapter} version to install`,
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
