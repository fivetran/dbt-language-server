import * as path from 'node:path';
import { installVsCodeAndRunTests, prepareBigQuery, preparePostgres, prepareSnowflake } from './runTestUtils';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  try {
    await prepareBigQuery();
    console.log('BigQuery prepared successfully');
    await preparePostgres();
    console.log('Postgres prepared successfully');
    await prepareSnowflake();
    console.log('Snowflake prepared successfully');
  } catch (e) {
    console.error(`Failed to prepare destination. Error: ${e instanceof Error ? e.message : String(e)}`);
    /* eslint-disable-next-line unicorn/no-process-exit */
    process.exit(1);
  }

  await installVsCodeAndRunTests('index', path.resolve(__dirname, '../../projects/test-workspace.code-workspace'));
}

main().catch(e => console.error(e));
