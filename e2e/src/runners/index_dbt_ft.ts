import { indexMain } from './indexMain';

// ts-unused-exports:disable-next-line
export async function run(): Promise<void> {
  return indexMain('0', '../dbt_ft.spec.js', []);
}
