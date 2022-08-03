import { compareVersions, getStringVersion, StatusNotification } from 'dbt-language-server-common';
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
    this.updatePythonStatusItemData(status);
    this.updateDbtStatusItemData(status);
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

  private updatePythonStatusItemData(status: StatusNotification): void {
    this.pythonData = status.pythonStatus.path
      ? {
          severity: LanguageStatusSeverity.Information,
          text: status.pythonStatus.path,
          detail: 'python interpreter path',
        }
      : {
          severity: LanguageStatusSeverity.Warning,
          text: 'Python',
          detail:
            'not found. [Install a supported version of Python on your system](https://code.visualstudio.com/docs/python/python-tutorial#_install-a-python-interpreter)',
        };
  }

  private updateDbtStatusItemData(status: StatusNotification): void {
    if (status.dbtStatus.versionInfo?.installedVersion && status.dbtStatus.versionInfo.latestVersion) {
      const compareResult = compareVersions(status.dbtStatus.versionInfo.installedVersion, status.dbtStatus.versionInfo.latestVersion);
      if (compareResult === 0) {
        this.dbtData = {
          severity: LanguageStatusSeverity.Information,
          text: `dbt ${getStringVersion(status.dbtStatus.versionInfo.installedVersion)}`,
          detail: `latest version installed`,
          command: undefined,
        };
        return;
      }
      this.dbtData = {
        severity: LanguageStatusSeverity.Warning,
        text: `dbt ${getStringVersion(status.dbtStatus.versionInfo.installedVersion)}`,
        detail: `installed version. Latest version: ${getStringVersion(status.dbtStatus.versionInfo.latestVersion)}`,
        command: { command: 'dbtWizard.installLatestDbt', title: 'Update To Latest Version' },
      };
      return;
    }

    this.dbtData = {
      severity: LanguageStatusSeverity.Error,
      text: 'dbt',
      detail: 'not found',
      command: { command: 'dbtWizard.installLatestDbt', title: 'Install Latest Version' },
    };
  }
}
