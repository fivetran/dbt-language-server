import { compareVersions, DbtStatus, getStringVersion, PythonStatus, StatusNotification } from 'dbt-language-server-common';
import { Command, LanguageStatusSeverity } from 'vscode';
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

  constructor(private items: LanguageStatusItems) {
    this.updateStatusUi();
  }

  updateStatusUi(): void {
    this.updatePythonUi();
    this.updateDbtUi();
  }

  updateStatusData(status: StatusNotification): void {
    this.updatePythonStatusItemData(status.pythonStatus);
    this.updateDbtStatusItemData(status.dbtStatus);
  }

  private updatePythonUi(): void {
    if (this.pythonData === undefined) {
      this.items.python.busy = true;
      this.items.python.severity = LanguageStatusSeverity.Information;
      this.items.python.text = 'Python';
      this.items.python.detail = undefined;
    } else {
      this.items.python.busy = false;
      this.items.python.severity = this.pythonData.severity;
      this.items.python.text = this.pythonData.text;
      this.items.python.detail = this.pythonData.detail;
    }
    this.items.python.command = { command: 'python.setInterpreter', title: 'Set Interpreter' };
  }

  private updateDbtUi(): void {
    if (this.dbtData === undefined) {
      this.items.dbt.busy = true;
      this.items.dbt.severity = LanguageStatusSeverity.Information;
      this.items.dbt.text = 'dbt';
      this.items.dbt.detail = undefined;
    } else {
      this.items.dbt.busy = false;
      this.items.dbt.severity = this.dbtData.severity;
      this.items.dbt.text = this.dbtData.text;
      this.items.dbt.detail = this.dbtData.detail;
      this.items.dbt.command = this.dbtData.command;
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
          text: 'Python',
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
      text: 'dbt',
      detail: 'not found',
      command: this.installDbtCommand('Install Latest Version'),
    };
  }

  installDbtCommand(title: string): Command {
    return { command: 'dbtWizard.installLatestDbt', title };
  }
}
