import { Command, DocumentFilter, languages, LanguageStatusItem, LanguageStatusSeverity } from 'vscode';

export class DbtWizardLanguageStatusItem {
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

  setDocumentFilter(filter: DocumentFilter): void {
    const filters = this.item.selector as DocumentFilter[];
    if (!filters.includes(filter)) {
      filters.push(filter);
    }
  }
}
