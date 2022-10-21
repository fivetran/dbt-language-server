import { Command, DocumentFilter, languages, LanguageStatusItem, LanguageStatusSeverity } from 'vscode';
import { DBT_PROJECT_YML, PACKAGES_YML, SUPPORTED_LANG_IDS } from '../Utils';

export class DbtWizardLanguageStatusItem {
  item: LanguageStatusItem;

  constructor(id: string, private defaultText: string) {
    const filters = [
      ...SUPPORTED_LANG_IDS.map<DocumentFilter>(language => ({ language })),
      ...[`**/${PACKAGES_YML}`, `**/${DBT_PROJECT_YML}`].map<DocumentFilter>(pattern => ({ pattern })),
    ];
    this.item = languages.createLanguageStatusItem(id, filters);
    this.setBusy();
  }

  setBusy(): void {
    this.item.busy = true;
    this.item.severity = LanguageStatusSeverity.Information;
    this.item.text = this.defaultText;
    this.item.detail = undefined;
    this.item.command = undefined;
  }

  setState(severity: LanguageStatusSeverity, text: string, detail?: string, command?: Command): void {
    this.item.busy = false;
    this.item.severity = severity;
    this.item.text = text;
    this.item.detail = detail;
    this.item.command = command;
  }
}
