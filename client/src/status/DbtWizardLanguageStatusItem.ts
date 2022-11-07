import { Command, DocumentFilter, languages, LanguageStatusItem, LanguageStatusSeverity } from 'vscode';
import { PROFILES_YML_DEFAULT_URI } from '../Utils';

export class DbtWizardLanguageStatusItem {
  static readonly PROFILES_YML_FILTER = { pattern: PROFILES_YML_DEFAULT_URI.fsPath };

  item: LanguageStatusItem;

  constructor(id: string, private defaultText: string) {
    this.item = languages.createLanguageStatusItem(id, []);
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

  setDocumentFilter(filters: DocumentFilter[]): void {
    const existingFilters = this.item.selector as DocumentFilter[];
    filters.filter(f => !existingFilters.includes(f)).forEach(f => existingFilters.push(f));
    if (existingFilters.length === 1) {
      existingFilters.push(DbtWizardLanguageStatusItem.PROFILES_YML_FILTER);
    } else {
      const index = existingFilters.indexOf(DbtWizardLanguageStatusItem.PROFILES_YML_FILTER);
      // We don't know what to show if there are more than one active projects
      if (index !== -1) {
        existingFilters.splice(index, 1);
      }
    }
  }
}
