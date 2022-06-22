import path = require('path');
import { installVsCodeAndRunTests } from './runTestUtils';

export const PROJECT_PATH = path.resolve(__dirname, '../../analytics/dbt_ft_prod');

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  console.log('Running dbt_ft tests');
  await installVsCodeAndRunTests(path.resolve(__dirname, './dbt_ft'), path.resolve(__dirname, PROJECT_PATH));
}

main().catch(e => console.error(e));
