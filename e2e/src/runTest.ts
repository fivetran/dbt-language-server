import path = require('path');
import { installVsCodeAndRunTests, prepareBigQuery, preparePostgres } from './runTestUtils';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  try {
    await prepareBigQuery();
    console.log('bigquery prepared successfully');
    await preparePostgres();
    console.log('postgres prepared successfully');
  } catch (err) {
    console.error(`Failed to prepare destination. Error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  await installVsCodeAndRunTests(path.resolve(__dirname, './index'), path.resolve(__dirname, '../projects/test-workspace.code-workspace'));
}

main().catch(e => console.error(e));
