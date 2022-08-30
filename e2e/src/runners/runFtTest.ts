import * as path from 'node:path';
import { installVsCodeAndRunTests } from './runTestUtils';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  console.log('Running dbt_ft tests');
  await installVsCodeAndRunTests('index_dbt_ft', path.resolve(__dirname, '../../../analytics/dbt_ft_prod'));
}

main().catch(e => console.error(e));
