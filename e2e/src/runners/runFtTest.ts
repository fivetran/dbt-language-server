import path = require('path');
import { installVsCodeAndRunTests } from './runTestUtils';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  console.log('Running dbt_ft tests');
  await installVsCodeAndRunTests(
    path.resolve(__dirname, 'dbt_ft'),
    path.resolve(__dirname, path.resolve(__dirname, '../../../analytics/dbt_ft_prod')),
  );
}

main().catch(e => console.error(e));
