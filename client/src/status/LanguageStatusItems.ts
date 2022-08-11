import { DbtWizardLanguageStatusItem } from './DbtWizardLanguageStatusItem';

export class LanguageStatusItems {
  python = new DbtWizardLanguageStatusItem('dbtWizardPython', 'Python');
  dbt = new DbtWizardLanguageStatusItem('dbtWizardDbt', 'dbt');
  dbtAdapters = new DbtWizardLanguageStatusItem('dbtWizardDbtAdapters', 'dbt Adapters');
}
