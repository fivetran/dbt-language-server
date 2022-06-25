import { runMain } from './runMain';

export async function run(): Promise<void> {
  return runMain('70s', '../**/*.spec.js', ['dbt_ft.spec.ts']);
}
