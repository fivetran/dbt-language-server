import {
  AdapterInfo,
  compareVersions,
  DbtStatus,
  getStringVersion,
  NO_PROJECT_PATH,
  PythonStatus,
  StatusNotification,
} from 'dbt-language-server-common';
import { Command, LanguageStatusSeverity, RelativePattern, Uri } from 'vscode';
import { LanguageStatusItems } from '../LanguageStatusItems';
import { StatusItemData } from '../StatusItemData';

export class NoProjectStatusGroup {
  private activeDbtProjectData: StatusItemData;
  private pythonData?: StatusItemData;
  private dbtData?: StatusItemData;
  private dbtAdaptersData?: StatusItemData;

  constructor(protected projectPath: string, protected items: LanguageStatusItems) {
    const documentFilters = [{ pattern: new RelativePattern(Uri.file(projectPath), '**/*') }, { scheme: 'untitled' }];

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

    this.items.activeDbtProject.setDocumentFilter(documentFilters);
    this.items.python.setDocumentFilter(documentFilters);
    this.items.dbt.setDocumentFilter(documentFilters);
    this.items.dbtAdapters.setDocumentFilter(documentFilters);
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
        title: 'Install dbt Adapters',
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

  installDbtCommand(title: string): Command {
    return { command: 'WizardForDbtCore(TM).installLatestDbt', title, arguments: [this.projectPath] };
  }
}
