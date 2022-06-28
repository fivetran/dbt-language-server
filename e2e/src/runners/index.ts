import { indexMain } from './indexMain';

export async function run(): Promise<void> {
  return indexMain('70s', '../**/*.spec.js', ['dbt_ft.spec.ts']);
}
