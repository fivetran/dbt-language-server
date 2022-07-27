import { Status, StatusNotification } from 'dbt-language-server-common';
import { AccessibilityInformation, languages, LanguageStatusItem, LanguageStatusSeverity, Uri, window } from 'vscode';
import { SUPPORTED_LANG_IDS } from './ExtensionClient';

interface LanguageStatusData {
  pythonData: StatusItemData;
}

interface StatusItemData {
  severity: LanguageStatusSeverity;
  text: string;
  detail?: string;
  accessibilityInformation?: AccessibilityInformation;
}

export class StatusHandler {
  static readonly PYTHON_ITEM_ID = 'dbtWizardPython';

  projectStatuses: Map<string, LanguageStatusData> = new Map();
  languageStatusItems: Map<string, LanguageStatusItem> = new Map();

  updateLanguageItems(uri: Uri): void {
    const pythonItem = this.getPythonItem();
    const key = [...this.projectStatuses.keys()].find(projectPath => uri.path.startsWith(projectPath));

    if (key === undefined) {
      pythonItem.busy = true;
      pythonItem.severity = LanguageStatusSeverity.Information;
      pythonItem.text = 'Python';
    } else {
      const statuses = this.projectStatuses.get(key);
      if (statuses !== undefined) {
        pythonItem.busy = false;
        pythonItem.severity = statuses.pythonData.severity;
        pythonItem.text = statuses.pythonData.text;
        pythonItem.detail = statuses.pythonData.detail;
      }
    }
  }

  onStatusChanged(statusNotification: StatusNotification): void {
    this.updateStatusItemsData(statusNotification.projectPath, statusNotification.status);
    const uri = window.activeTextEditor?.document.uri;
    if (uri) {
      this.updateLanguageItems(uri);
    }
  }

  updateStatusItemsData(projectPath: string, status: Status): void {
    const pythonItem: StatusItemData = {
      severity: status.pythonStatus.path ? LanguageStatusSeverity.Information : LanguageStatusSeverity.Warning,
      text: status.pythonStatus.path ?? 'Python',
      detail: status.pythonStatus.path
        ? 'Python interpreter path'
        : 'Not found. [Install a supported version of Python on your system](https://code.visualstudio.com/docs/python/python-tutorial#_install-a-python-interpreter)',
    };
    this.projectStatuses.set(projectPath, { pythonData: pythonItem });
  }

  getPythonItem(): LanguageStatusItem {
    let pythonItem = this.languageStatusItems.get(StatusHandler.PYTHON_ITEM_ID);
    if (pythonItem === undefined) {
      pythonItem = languages.createLanguageStatusItem(StatusHandler.PYTHON_ITEM_ID, SUPPORTED_LANG_IDS);
      pythonItem.name = 'Python';
      pythonItem.command = { command: 'python.setInterpreter', title: 'Set Interpreter' };
      this.languageStatusItems.set(StatusHandler.PYTHON_ITEM_ID, pythonItem);
    }
    return pythonItem;
  }
}
