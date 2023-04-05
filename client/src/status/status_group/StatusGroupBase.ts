import {
  AdapterInfo,
  compareVersions,
  DbtStatus,
  getStringVersion,
  NO_PROJECT_PATH,
  PythonStatus,
  StatusNotification,
} from 'dbt-language-server-common';
import { Command, DocumentFilter, LanguageStatusSeverity } from 'vscode';
import { LanguageStatusItems } from '../LanguageStatusItems';
import { StatusItemData } from '../StatusItemData';

export abstract class StatusGroupBase {
  private activeDbtProjectData: StatusItemData;
  private pythonData?: StatusItemData;
  private dbtData?: StatusItemData;
  private dbtAdaptersData?: StatusItemData;

  constructor(protected projectPath: string, protected items: LanguageStatusItems, filters: DocumentFilter[]) {
    this.activeDbtProjectData =
      projectPath === NO_PROJECT_PATH
        ? {
            severity: LanguageStatusSeverity.Information,
            text: 'No active dbt project',
            detail: '',
          }
        : {
            severity: LanguageStatusSeverity.Information,
            text: 'dbt project',
            detail: this.projectPath,
          };

    this.items.activeDbtProject.setDocumentFilter(filters);
    this.items.python.setDocumentFilter(filters);
    this.items.dbt.setDocumentFilter(filters);
    this.items.dbtAdapters.setDocumentFilter(filters);
  }

  setBusy(): void {
    this.items.activeDbtProject.setBusy();
    this.items.python.setBusy();
    this.items.dbt.setBusy();
    this.items.dbtAdapters.setBusy();
  }

  updateStatusUi(): void {
    this.updateActiveDbtProjectUi();
    this.updatePythonUi();
    this.updateDbtUi();
    this.updateDbtAdaptersUi();
  }

  updateStatusData(status: StatusNotification): void {
    if (status.pythonStatus) {
      this.updatePythonStatusItemData(status.pythonStatus);
    }

    if (status.dbtStatus) {
      this.updateDbtStatusItemData(status.dbtStatus);
      this.updateDbtAdaptersStatusItemData(status.dbtStatus.versionInfo?.installedAdapters ?? []);
    }
  }

  private updateActiveDbtProjectUi(): void {
    this.items.activeDbtProject.setState(this.activeDbtProjectData.severity, this.activeDbtProjectData.text, this.activeDbtProjectData.detail, {
      command: 'WizardForDbtCore(TM).createDbtProject',
      title: 'Create New dbt Project',
    });
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
        title: 'Install different adapter',
        arguments: [this.projectPath],
      });
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
    const latestVersion = status.versionInfo?.latestVersion;
    const installedVersion = status.versionInfo?.installedVersion;
    const latestInstalled = latestVersion && installedVersion && compareVersions(latestVersion, installedVersion) === 0;

    let installedDetails = 'installed version';
    if (latestVersion && installedVersion) {
      installedDetails = latestInstalled ? 'latest version installed' : `installed version. Latest version: ${getStringVersion(latestVersion)}`;
    }

    this.dbtData = installedVersion
      ? {
          severity: latestInstalled ? LanguageStatusSeverity.Information : LanguageStatusSeverity.Warning,
          text: `dbt Core ${getStringVersion(installedVersion)}`,
          detail: installedDetails,
          command: this.installDbtCommand('Install different version'),
        }
      : {
          severity: LanguageStatusSeverity.Error,
          text: LanguageStatusItems.DBT_DEFAULT_TEXT,
          detail: 'not found',
          command: this.installDbtCommand('Install dbt Core'),
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

  installDbtCommand(title: string): Command {
    return { command: 'WizardForDbtCore(TM).installDbtCore', title, arguments: [this.projectPath] };
  }
}
