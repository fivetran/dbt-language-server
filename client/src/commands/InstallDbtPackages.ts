import { DbtPackageInfo, InstallDbtPackagesParams } from 'dbt-language-server-common';
import {
  Disposable,
  env,
  QuickInputButtons,
  QuickPick,
  QuickPickItem,
  QuickPickItemButtonEvent,
  QuickPickItemKind,
  ThemeIcon,
  Uri,
  window,
} from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { Command } from './CommandManager';

export class InstallDbtPackages implements Command {
  readonly id = 'dbtWizard.installDbtPackages';

  static readonly SEPARATOR = {
    label: '',
    kind: QuickPickItemKind.Separator,
  };
  static readonly DBT_HUB_TOOLTIP = 'Open dbt hub';
  static readonly HUB_URI = Uri.parse('https://hub.getdbt.com');
  static readonly GIT_HUB_BUTTON = { iconPath: new ThemeIcon('github'), tooltip: 'Open in GitHub' };
  static readonly DBT_HUB_BUTTON = { iconPath: new ThemeIcon('link-external'), tooltip: InstallDbtPackages.DBT_HUB_TOOLTIP };

  selectedPackage?: string;

  constructor(private dbtLanguageClientManager: DbtLanguageClientManager) {}

  async execute(installDbtPackagesParams?: InstallDbtPackagesParams): Promise<void> {
    if (installDbtPackagesParams === undefined) {
      const client = await this.dbtLanguageClientManager.getClientForActiveDocument();

      if (client) {
        const packages = await client.sendRequest<DbtPackageInfo[]>('dbtWizard/getListOfPackages');
        packages.sort((p1, p2) => p1.installString.localeCompare(p2.installString));

        let version = undefined;
        let backPressed = false;
        do {
          backPressed = false;
          const packageName = await this.getPackage(packages, this.selectedPackage);
          this.selectedPackage = packageName;

          if (packageName !== undefined) {
            const versions = await client.sendRequest<string[]>('dbtWizard/getPackageVersions', packageName);
            try {
              version = await this.getVersion(packages, packageName, versions);
            } catch (e) {
              backPressed = e === QuickInputButtons.Back;
            }
          }
        } while (backPressed);

        console.log(version);
      }
    }
  }

  private async getPackage(packages: DbtPackageInfo[], activeItemLabel?: string): Promise<string | undefined> {
    return InstallDbtPackages.showQuickPick(
      {
        items: this.createPackageNameItems(packages),
        buttons: [InstallDbtPackages.DBT_HUB_BUTTON],
        placeholder: 'Filter by name, e.g. salesforce',
        title: 'Select dbt package to install',
      },
      async e => {
        const packageInfo = packages.find(p => p.installString === e.item.label);
        if (packageInfo) {
          await env.openExternal(Uri.parse(`https://github.com/${packageInfo.gitHubUser}/${packageInfo.repositoryName}#readme`));
        }
      },
      activeItemLabel,
    );
  }

  getVersion(packages: DbtPackageInfo[], packageName: string, versions: string[]): Promise<string | undefined> {
    return InstallDbtPackages.showQuickPick(
      {
        items: this.createVersionItems(versions),
        buttons: [QuickInputButtons.Back, InstallDbtPackages.DBT_HUB_BUTTON],
        placeholder: 'Filter by version, e.g. 0.5.0',
        title: `Select version of ${packageName} to install`,
      },
      async e => {
        const packageInfo = packages.find(p => p.installString === packageName);
        if (packageInfo) {
          await env.openExternal(
            Uri.parse(`https://github.com/${packageInfo.gitHubUser}/${packageInfo.repositoryName}/tree/${e.item.label}/#readme`),
          ); // TODO: not label
        }
      },
    );
  }

  createPackageNameItems(packages: DbtPackageInfo[]): QuickPickItem[] {
    let lastGitHubUser = undefined;
    const items: QuickPickItem[] = [];

    for (const packageInfo of packages) {
      if (lastGitHubUser !== packageInfo.gitHubUser) {
        items.push(InstallDbtPackages.SEPARATOR);
        lastGitHubUser = packageInfo.gitHubUser;
      }

      items.push({
        label: packageInfo.installString,
        buttons: [InstallDbtPackages.GIT_HUB_BUTTON],
      });
    }
    return items;
  }

  createVersionItems(versions: string[]): QuickPickItem[] {
    return versions.map(label => ({
      label,
      buttons: [InstallDbtPackages.GIT_HUB_BUTTON],
    }));
  }

  static async showQuickPick(
    options: Pick<QuickPick<QuickPickItem>, 'items' | 'buttons' | 'title' | 'placeholder'>,
    onDidTriggerItemButton: (e: QuickPickItemButtonEvent<QuickPickItem>) => void,
    activeItemLabel?: string,
  ): Promise<string | undefined> {
    const disposables: Disposable[] = [];
    const pick = window.createQuickPick();
    pick.items = options.items;
    pick.buttons = options.buttons;
    pick.title = options.title;
    pick.placeholder = options.placeholder;
    pick.ignoreFocusOut = true;
    if (activeItemLabel) {
      const item = pick.items.find(i => i.label === activeItemLabel);
      if (item) {
        pick.activeItems = [item];
      }
    }

    pick.onDidTriggerItemButton(onDidTriggerItemButton);

    try {
      return await new Promise<string | undefined>((resolve, reject) => {
        disposables.push(
          pick.onDidTriggerButton(async button => {
            if (button === QuickInputButtons.Back) {
              reject(QuickInputButtons.Back);
            } else if (button.tooltip === InstallDbtPackages.DBT_HUB_TOOLTIP) {
              await env.openExternal(InstallDbtPackages.HUB_URI);
            }
          }),
          pick.onDidAccept(() => {
            const [selection] = pick.selectedItems;
            resolve(selection.label);
          }),
          pick.onDidHide(() => {
            resolve(undefined);
          }),
        );
        pick.show();
      });
    } finally {
      disposables.forEach(d => {
        d.dispose();
      });
    }
  }
}
