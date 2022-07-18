import { indexMain } from './indexMain';

export async function run(): Promise<void> {
  const testsToSkip = ((process.env['SKIP_TESTS'] as string[] | undefined) ?? []).concat('dbt_ft.spec.ts');
  return indexMain('70s', '../**/*.spec.js', testsToSkip);
}
