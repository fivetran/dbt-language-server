import { languages } from 'vscode';
import { SUPPORTED_LANG_IDS } from '../ExtensionClient';

export class LanguageStatusItems {
  python = languages.createLanguageStatusItem('dbtWizardPython', SUPPORTED_LANG_IDS);
  dbt = languages.createLanguageStatusItem('dbtWizardDbt', SUPPORTED_LANG_IDS);
}
