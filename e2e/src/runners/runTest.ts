import * as path from 'node:path';
import { installVsCodeAndRunTests, prepareBigQuery, preparePostgres } from './runTestUtils';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  try {
    await prepareBigQuery();
    console.log('bigquery prepared successfully');
    await preparePostgres();
    console.log('postgres prepared successfully');
  } catch (e) {
    throw new Error(`Failed to prepare destination. Error: ${e instanceof Error ? e.message : String(e)}`);
  }

  await installVsCodeAndRunTests('index', path.resolve(__dirname, '../../projects/test-workspace.code-workspace'));
}

main().catch(e => console.error(e));
