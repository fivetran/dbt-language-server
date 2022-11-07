import { Command, LanguageStatusSeverity } from 'vscode';

export interface StatusItemData {
  severity: LanguageStatusSeverity;
  text: string;
  detail?: string;
  command?: Command;
}
