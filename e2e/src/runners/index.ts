import { indexMain } from './indexMain';

export async function run(): Promise<void> {
  const testsToSkip = (process.env['SKIP_TESTS']?.split(',') ?? []).concat('dbt_ft.spec.js').concat('dbt_error.spec.ts');
  return indexMain('70s', '../**/*.spec.js', testsToSkip);
}
