import * as path from 'path';

import { runTests } from '@vscode/test-electron';
import { homedir } from 'os';
import { BigQuery } from '@google-cloud/bigquery';

async function main() {
  try {
    await prepareBigQuery();

    // The folder containing the Extension Manifest package.json
    // Passed to `--extensionDevelopmentPath`
    const extensionDevelopmentPath = path.resolve(__dirname, '../../../');

    // The path to test runner
    // Passed to --extensionTestsPath
    const extensionTestsPath = path.resolve(__dirname, './index');

    // Download VS Code, unzip it and run the integration test
    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [path.resolve(__dirname, '../../test-fixture/')],
      extensionTestsEnv: { BIG_QUERY_URL: 'http://localhost:8080' },
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

async function prepareBigQuery() {
  const options = {
    keyFilename: `${homedir()}/.dbt/bq-test-project.json`,
    projectId: 'singular-vector-135519',
  };
  const bigQuery = new BigQuery(options);

  const dsName = 'dbt_ls_e2e_dataset';
  let dataset = bigQuery.dataset(dsName);
  await dataset.get({ autoCreate: true });

  const tableName = 'test_table1';
  let table = dataset.table(tableName);
  const [exists] = await table.exists();
  if (!exists) {
    await dataset.createTable('test_table1', {
      schema: [
        { name: 'id', type: 'INTEGER' },
        { name: 'time', type: 'TIMESTAMP' },
        { name: 'name', type: 'STRING' },
        { name: 'date', type: 'DATE' },
      ],
    });
  }
}

main();
