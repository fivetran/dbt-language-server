import { indexMain } from './indexMain';

export async function run(): Promise<void> {
  const testsToSkip = [...(process.env['SKIP_TESTS']?.split(',') ?? []), 'dbt_ft.spec.js'];
  return indexMain('70s', '../**/*.spec.js', testsToSkip);
}
