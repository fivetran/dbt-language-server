import { indexMain } from './indexMain';

export async function run(): Promise<void> {
  return indexMain('0', '../dbt_ft.spec.js', []);
}
