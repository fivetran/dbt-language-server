import { NO_PROJECT_PATH } from 'dbt-language-server-common';
import { LanguageStatusItems } from '../LanguageStatusItems';
import { StatusGroupBase } from './StatusGroupBase';

export class NoProjectStatusGroup extends StatusGroupBase {
  constructor(items: LanguageStatusItems) {
    const documentFilters = [{ scheme: 'file' }, { scheme: 'untitled' }];
    super(NO_PROJECT_PATH, items, documentFilters);
  }
}
