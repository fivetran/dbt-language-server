import { PROFILES_YML } from '../Utils';
import { DbtWizardLanguageStatusItem } from './DbtWizardLanguageStatusItem';

export class LanguageStatusItems {
  static readonly PYTHON_DEFAULT_TEXT = 'Python';
  static readonly DBT_DEFAULT_TEXT = 'dbt Core';
  static readonly DBT_ADAPTERS_DEFAULT_TEXT = 'dbt Adapters';
  static readonly DBT_PACKAGES_DEFAULT_TEXT = 'dbt Packages';
  static readonly PROFILES_YML_DEFAULT_TEXT = PROFILES_YML;
  static readonly DBT_ACTIVE_PROJECT_DEFAULT_TEXT = 'dbt Project';

  activeDbtProject = new DbtWizardLanguageStatusItem('dbtWizardActiveProject`', LanguageStatusItems.DBT_ACTIVE_PROJECT_DEFAULT_TEXT);
  python = new DbtWizardLanguageStatusItem('dbtWizardPython', LanguageStatusItems.PYTHON_DEFAULT_TEXT);
  dbt = new DbtWizardLanguageStatusItem('dbtWizardDbt', LanguageStatusItems.DBT_DEFAULT_TEXT);
  dbtAdapters = new DbtWizardLanguageStatusItem('dbtWizardDbtAdapters', LanguageStatusItems.DBT_ADAPTERS_DEFAULT_TEXT);

  dbtPackages = new DbtWizardLanguageStatusItem('dbtWizardDbtPackages', LanguageStatusItems.DBT_PACKAGES_DEFAULT_TEXT);
  profilesYml = new DbtWizardLanguageStatusItem('dbtWizardProfilesYml', LanguageStatusItems.PROFILES_YML_DEFAULT_TEXT);
}
