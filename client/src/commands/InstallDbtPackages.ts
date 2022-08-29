import { DbtPackageInfo, DbtPackageVersions } from 'dbt-language-server-common';
import {
  commands,
  Disposable,
  env,
  QuickInputButtons,
  QuickPick,
  QuickPickItem,
  QuickPickItemButtonEvent,
  QuickPickItemKind,
  Selection,
  ThemeIcon,
  Uri,
  window,
} from 'vscode';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { log } from '../Logger';
import { Command } from './CommandManager';
import { OpenOrCreatePackagesYml } from './OpenOrCreatePackagesYml';

export class InstallDbtPackages implements Command {
  static readonly ID = 'dbtWizard.installDbtPackages';
  readonly id = InstallDbtPackages.ID;

  static readonly SEPARATOR = { label: '', kind: QuickPickItemKind.Separator };
  static readonly DBT_HUB_TOOLTIP = 'Open dbt hub';
  static readonly HUB_URI = Uri.parse('https://hub.getdbt.com');
  static readonly GIT_HUB_BUTTON = { iconPath: new ThemeIcon('github'), tooltip: 'Open in GitHub' };
  static readonly DBT_HUB_BUTTON = { iconPath: new ThemeIcon('link-external'), tooltip: InstallDbtPackages.DBT_HUB_TOOLTIP };

  selectedPackage?: string;

  constructor(private dbtLanguageClientManager: DbtLanguageClientManager) {}

  async execute(projectPath?: string): Promise<void> {
    const client =
      projectPath === undefined
        ? await this.dbtLanguageClientManager.getClientForActiveDocument()
        : this.dbtLanguageClientManager.getClientByPath(projectPath);

    if (client) {
      const packagesPromise = client.sendRequest<DbtPackageInfo[]>('dbtWizard/getListOfPackages');

      let version = undefined;
      let packageName = undefined;
      let backPressed = false;
      do {
        backPressed = false;
        packageName = await this.getPackage(packagesPromise, this.selectedPackage);
        this.selectedPackage = packageName;

        if (packageName !== undefined) {
          const versionsPromise = client.sendRequest<DbtPackageVersions>('dbtWizard/getPackageVersions', packageName);
          try {
            version = await this.getVersion(packagesPromise, packageName, versionsPromise);
          } catch (e) {
            backPressed = e === QuickInputButtons.Back;
          }
        }
      } while (backPressed);

      if (version) {
        const selectionStart = await client.sendRequest<number>('dbtWizard/addNewDbtPackage', { packageName, version });
        const textEditor = await OpenOrCreatePackagesYml.openOrCreateConfig(client.getProjectUri().fsPath);

        // Sometimes document is not in refreshed state and we should ensure that it contains changes made on LS side
        // https://github.com/microsoft/vscode/issues/7532#issuecomment-460158858
        await commands.executeCommand('workbench.action.files.revert');

        const position = textEditor.document.positionAt(selectionStart);
        textEditor.selection = new Selection(position.line, 0, position.line + 2, 0);
      }
    }
  }

  private async getPackage(packagesPromise: Promise<DbtPackageInfo[]>, activeItemLabel?: string): Promise<string | undefined> {
    return InstallDbtPackages.showQuickPick(
      {
        buttons: [InstallDbtPackages.DBT_HUB_BUTTON],
        placeholder: 'Filter by name, e.g. salesforce',
        title: 'Select dbt package to install',
      },
      packagesPromise.then(p => this.createPackageNameItems(p)),
      async e => {
        const packageInfo = (await packagesPromise).find(p => p.installString === e.item.label);
        if (packageInfo) {
          await env.openExternal(Uri.parse(`https://github.com/${packageInfo.gitHubUser}/${packageInfo.repositoryName}#readme`));
        }
      },
      activeItemLabel,
    );
  }

  getVersion(
    packagesPromise: Promise<DbtPackageInfo[]>,
    packageName: string,
    versionsPromise: Promise<DbtPackageVersions>,
  ): Promise<string | undefined> {
    return InstallDbtPackages.showQuickPick(
      {
        buttons: [QuickInputButtons.Back, InstallDbtPackages.DBT_HUB_BUTTON],
        placeholder: 'Filter by version, e.g. 0.5.0',
        title: `Select version of ${packageName} to install`,
      },
      versionsPromise.then(v => this.createVersionItems(v)),
      async e => {
        const packageInfo = (await packagesPromise).find(p => p.installString === packageName);
        if (packageInfo) {
          const actualTagName = (await versionsPromise)[e.item.label];
          await env.openExternal(
            Uri.parse(`https://github.com/${packageInfo.gitHubUser}/${packageInfo.repositoryName}/tree/${actualTagName}/#readme`),
          );
        }
      },
    );
  }

  createPackageNameItems(packages: DbtPackageInfo[]): QuickPickItem[] {
    packages.sort((p1, p2) => p1.installString.localeCompare(p2.installString));

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

  createVersionItems(versions: DbtPackageVersions): QuickPickItem[] {
    return Object.keys(versions).map(label => ({
      label,
      buttons: [InstallDbtPackages.GIT_HUB_BUTTON],
    }));
  }

  static async showQuickPick(
    options: Pick<QuickPick<QuickPickItem>, 'buttons' | 'title' | 'placeholder'>,
    itemsPromise: Promise<QuickPickItem[]>,
    onDidTriggerItemButton: (e: QuickPickItemButtonEvent<QuickPickItem>) => void,
    activeItemLabel?: string,
  ): Promise<string | undefined> {
    const disposables: Disposable[] = [];
    const pick = window.createQuickPick();
    pick.busy = true;
    pick.buttons = options.buttons;
    pick.title = options.title;
    pick.placeholder = options.placeholder;
    pick.ignoreFocusOut = true;
    itemsPromise
      .then(items => {
        pick.busy = false;
        pick.items = items;
        if (activeItemLabel) {
          const item = pick.items.find(i => i.label === activeItemLabel);
          if (item) {
            pick.activeItems = [item];
          }
        }
        return items;
      })
      .catch(e => log(`Error while fetching items for QuickPick: ${e instanceof Error ? e.message : String(e)}`));

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
            pick.hide();
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
