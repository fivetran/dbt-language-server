import { runMain } from './runMain';

export async function run(): Promise<void> {
  return runMain('0', '../dbt_ft.spec.js', []);
}
