import { indexMain } from './indexMain';

export async function run(): Promise<void> {
  const testsToSkip = ['dbt_ft.spec.js'];
  const skipFromEnvString = process.env['SKIP_TESTS'];
  if (skipFromEnvString) {
    testsToSkip.push(...skipFromEnvString.split(','));
  }
  return indexMain('70s', '../**/*.spec.js', testsToSkip);
}
