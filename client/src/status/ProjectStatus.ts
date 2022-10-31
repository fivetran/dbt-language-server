import {
  AdapterInfo,
  compareVersions,
  DbtStatus,
  getStringVersion,
  PackagesStatus,
  PythonStatus,
  StatusNotification,
} from 'dbt-language-server-common';
import { homedir } from 'node:os';
import { Command, LanguageStatusSeverity, RelativePattern, Uri } from 'vscode';
import { InstallDbtPackages } from '../commands/InstallDbtPackages';
import { PACKAGES_YML, PROFILES_YML } from '../Utils';
import { LanguageStatusItems } from './LanguageStatusItems';
import path = require('node:path');

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
  private profilesYmlData: StatusItemData = {
    severity: LanguageStatusSeverity.Information,
    text: PROFILES_YML,
    detail: `[Open](${Uri.file(path.join(homedir(), '.dbt', PROFILES_YML)).toString()})`,
  };

  constructor(private projectPath: string, private items: LanguageStatusItems) {
    this.setDocumentFilter();
    this.updateStatusUi();
  }

  setDocumentFilter(): void {
    const documentFilter = { pattern: new RelativePattern(Uri.file(this.projectPath), '**/*') };
    this.items.python.setDocumentFilter(documentFilter);
    this.items.dbt.setDocumentFilter(documentFilter);
    this.items.dbtAdapters.setDocumentFilter(documentFilter);
    this.items.dbtPackages.setDocumentFilter(documentFilter);
    this.items.profilesYml.setDocumentFilter(documentFilter);
  }

  setBusy(): void {
    this.items.python.setBusy();
    this.items.dbt.setBusy();
    this.items.dbtAdapters.setBusy();
    this.items.dbtPackages.setBusy();
    this.items.profilesYml.setBusy();
  }

  updateStatusUi(): void {
    this.updatePythonUi();
    this.updateDbtUi();
    this.updateDbtAdaptersUi();
    this.updateDbtPackagesUi();
    this.updateProfilesYmlUi();
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
        command: 'WizardForDbtCore(TM).installDbtAdapters',
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

  private updateProfilesYmlUi(): void {
    this.items.profilesYml.setState(this.profilesYmlData.severity, this.profilesYmlData.text, this.profilesYmlData.detail);
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
          detail: 'installed version',
          command: this.installDbtCommand('Update To Latest Version'),
        };
        return;
      }

      const compareResult = compareVersions(status.versionInfo.installedVersion, status.versionInfo.latestVersion);
      // For v1.0.0 dbt CLI returns that latest version is 1.0.0, in later versions looks like it is fixed
      const versionGreaterThanOne = compareVersions(status.versionInfo.installedVersion, { major: 1, minor: 0, patch: 0 }) > 0;
      if (compareResult === 0 && versionGreaterThanOne) {
        this.dbtData = {
          severity: LanguageStatusSeverity.Information,
          text: `dbt ${getStringVersion(status.versionInfo.installedVersion)}`,
          detail: 'latest version installed',
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
          detail: `[Open](${Uri.file(path.join(this.projectPath, 'packages.yml')).toString()})`,
          command,
        }
      : {
          severity: LanguageStatusSeverity.Information,
          text: `No ${PACKAGES_YML}`,
          detail: '',
          command,
        };
  }

  installDbtCommand(title: string): Command {
    return { command: 'WizardForDbtCore(TM).installLatestDbt', title, arguments: [this.projectPath] };
  }
}
