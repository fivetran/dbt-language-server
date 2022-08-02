import { initializeExtensionApi } from '../helper';
import { indexMain } from './indexMain';

export async function run(): Promise<void> {
  initializeExtensionApi();
  const testsToSkip = (process.env['SKIP_TESTS']?.split(',') ?? []).concat('dbt_ft.spec.js');
  return indexMain('70s', '../**/*.spec.js', testsToSkip);
}
