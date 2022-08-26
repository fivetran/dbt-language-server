import {
  AdapterInfo,
  compareVersions,
  DbtStatus,
  getStringVersion,
  PackagesStatus,
  PythonStatus,
  StatusNotification,
} from 'dbt-language-server-common';
import { Command, LanguageStatusSeverity } from 'vscode';
import { InstallDbtPackages } from '../commands/InstallDbtPackages';
import { OpenOrCreatePackagesYml } from '../commands/OpenOrCreatePackagesYml';
import { PACKAGES_YML } from '../Constants';
import { LanguageStatusItems } from './LanguageStatusItems';

interface StatusItemData {
  severity: LanguageStatusSeverity;
  text: string;
  detail?: string;
  command?: Command;
}

export class ProjectStatus {
  private pythonData?: StatusItemData;
  private dbtData?: StatusItemData;
  private dbtAdaptersData?: StatusItemData;
  private dbtPackagesData?: StatusItemData;

  constructor(private projectPath: string, private items: LanguageStatusItems) {
    this.updateStatusUi();
  }

  setBusy(): void {
    this.items.python.setBusy();
    this.items.dbt.setBusy();
    this.items.dbtAdapters.setBusy();
    this.items.dbtPackages.setBusy();
  }

  updateStatusUi(): void {
    this.updatePythonUi();
    this.updateDbtUi();
    this.updateDbtAdaptersUi();
    this.updateDbtPackagesUi();
  }

  updateStatusData(status: StatusNotification): void {
    if (status.pythonStatus) {
      this.updatePythonStatusItemData(status.pythonStatus);
    }

    if (status.dbtStatus) {
      this.updateDbtStatusItemData(status.dbtStatus);
      this.updateDbtAdaptersStatusItemData(status.dbtStatus.versionInfo?.installedAdapters ?? []);
    }

    if (status.packagesStatus) {
      this.updateDbtPackagesStatusItemData(status.packagesStatus);
    }
  }

  private updatePythonUi(): void {
    if (this.pythonData === undefined) {
      this.items.python.setBusy();
    } else {
      this.items.python.setState(this.pythonData.severity, this.pythonData.text, this.pythonData.detail, {
        command: 'python.setInterpreter',
        title: 'Set Interpreter',
      });
    }
  }

  private updateDbtUi(): void {
    if (this.dbtData === undefined) {
      this.items.dbt.setBusy();
    } else {
      this.items.dbt.setState(this.dbtData.severity, this.dbtData.text, this.dbtData.detail, this.dbtData.command);
    }
  }

  private updateDbtAdaptersUi(): void {
    if (this.dbtAdaptersData === undefined) {
      this.items.dbtAdapters.setBusy();
    } else {
      this.items.dbtAdapters.setState(this.dbtAdaptersData.severity, this.dbtAdaptersData.text, this.dbtAdaptersData.detail, {
        command: 'dbtWizard.installDbtAdapters',
        title: 'Install dbt Adapters',
        arguments: [this.projectPath],
      });
    }
  }

  private updateDbtPackagesUi(): void {
    if (!this.dbtPackagesData) {
      this.items.dbtPackages.setBusy();
    } else {
      this.items.dbtPackages.setState(
        this.dbtPackagesData.severity,
        this.dbtPackagesData.text,
        this.dbtPackagesData.detail,
        this.dbtPackagesData.command,
      );
    }
  }

  private updatePythonStatusItemData(status: PythonStatus): void {
    this.pythonData = status.path
      ? {
          severity: LanguageStatusSeverity.Information,
          text: status.path,
          detail: 'python interpreter path',
        }
      : {
          severity: LanguageStatusSeverity.Error,
          text: LanguageStatusItems.PYTHON_DEFAULT_TEXT,
          detail:
            'not found. [Install a supported version of Python on your system](https://code.visualstudio.com/docs/python/python-tutorial#_install-a-python-interpreter)',
        };
  }

  private updateDbtStatusItemData(status: DbtStatus): void {
    if (status.versionInfo?.installedVersion) {
      if (!status.versionInfo.latestVersion) {
        this.dbtData = {
          severity: LanguageStatusSeverity.Warning,
          text: `dbt ${getStringVersion(status.versionInfo.installedVersion)}`,
          detail: `installed version`,
          command: this.installDbtCommand('Update To Latest Version'),
        };
        return;
      }

      const compareResult = compareVersions(status.versionInfo.installedVersion, status.versionInfo.latestVersion);
      // For v1.0.0 dbt CLI returns that latest version is 1.0.0, in later versions looks like it is fixed
      const versionGreaterThan1_0_0 = compareVersions(status.versionInfo.installedVersion, { major: 1, minor: 0, patch: 0 }) > 0;
      if (compareResult === 0 && versionGreaterThan1_0_0) {
        this.dbtData = {
          severity: LanguageStatusSeverity.Information,
          text: `dbt ${getStringVersion(status.versionInfo.installedVersion)}`,
          detail: `latest version installed`,
          command: undefined,
        };
        return;
      }

      this.dbtData = {
        severity: LanguageStatusSeverity.Warning,
        text: `dbt ${getStringVersion(status.versionInfo.installedVersion)}`,
        detail: `installed version. Latest version: ${getStringVersion(status.versionInfo.latestVersion)}`,
        command: this.installDbtCommand('Update To Latest Version'),
      };
      return;
    }

    this.dbtData = {
      severity: LanguageStatusSeverity.Error,
      text: LanguageStatusItems.DBT_DEFAULT_TEXT,
      detail: 'not found',
      command: this.installDbtCommand('Install Latest Version'),
    };
  }

  private updateDbtAdaptersStatusItemData(adaptersInfo: AdapterInfo[]): void {
    this.dbtAdaptersData =
      adaptersInfo.length > 0
        ? {
            severity: LanguageStatusSeverity.Information,
            text: adaptersInfo.map(a => `${a.name} ${a.version ? getStringVersion(a.version) : ''}`).join(', '),
            detail: 'installed dbt adapters',
          }
        : {
            severity: LanguageStatusSeverity.Error,
            text: LanguageStatusItems.DBT_ADAPTERS_DEFAULT_TEXT,
            detail: 'No dbt adapters installed',
          };
  }

  private updateDbtPackagesStatusItemData(packagesStatus: PackagesStatus): void {
    const command = { command: InstallDbtPackages.ID, title: 'Install dbt Packages', arguments: [this.projectPath] };
    this.dbtPackagesData = packagesStatus.packagesYmlFound
      ? {
          severity: LanguageStatusSeverity.Information,
          text: PACKAGES_YML,
          detail: this.openOrCreateLink(false),
          command,
        }
      : {
          severity: LanguageStatusSeverity.Information,
          text: `No ${PACKAGES_YML}`,
          detail: this.openOrCreateLink(true),
          command,
        };
  }

  openOrCreateLink(create: boolean): string {
    return `[${create ? 'Create' : 'Open'}](command:${OpenOrCreatePackagesYml.ID}?${encodeURIComponent(JSON.stringify(this.projectPath))})`;
  }

  installDbtCommand(title: string): Command {
    return { command: 'dbtWizard.installLatestDbt', title, arguments: [this.projectPath] };
  }
}
