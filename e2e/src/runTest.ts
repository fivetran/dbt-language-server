import { BigQuery, TableField } from '@google-cloud/bigquery';
import { downloadAndUnzipVSCode, resolveCliPathFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { spawnSync } from 'child_process';
import { homedir } from 'os';
import * as path from 'path';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  try {
    await prepareBigQuery();

    const extensionDevelopmentPath = process.argv[2];
    console.log(`Running tests for path: ${extensionDevelopmentPath}`);
    const defaultCachePath = path.resolve(extensionDevelopmentPath, '.vscode-test');
    const extensionsInstallPath = path.join(defaultCachePath, 'extensions');

    const vscodeExecutablePath = await downloadAndUnzipVSCode();

    const cliPath = resolveCliPathFromVSCodeExecutablePath(vscodeExecutablePath);
    spawnSync(cliPath, ['--install-extension=ms-python.python', `--extensions-dir=${extensionsInstallPath}`], {
      encoding: 'utf-8',
      stdio: 'inherit',
    });

    const extensionTestsPath = path.resolve(__dirname, './index');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [path.resolve(__dirname, '../projects/test-workspace.code-workspace'), `--extensions-dir=${extensionsInstallPath}`],
      extensionTestsEnv: { CLI_PATH: cliPath, EXTENSIONS_INSTALL_PATH: extensionsInstallPath, DBT_LS_DISABLE_TELEMETRY: 'true' },
    });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

async function prepareBigQuery(): Promise<void> {
  const options = {
    keyFilename: `${homedir()}/.dbt/bq-test-project.json`,
    projectId: 'singular-vector-135519',
  };
  const bigQuery = new BigQuery(options);

  const dsName = 'dbt_ls_e2e_dataset';
  const dataset = bigQuery.dataset(dsName);
  await dataset.get({ autoCreate: true });

  await ensureTableExists(bigQuery, dsName, 'test_table1', [
    { name: 'id', type: 'INTEGER' },
    { name: 'time', type: 'TIMESTAMP' },
    { name: 'name', type: 'STRING' },
    { name: 'date', type: 'DATE' },
  ]);

  await ensureTableExists(bigQuery, dsName, 'users', [
    { name: 'id', type: 'INTEGER' },
    { name: 'name', type: 'STRING' },
    { name: 'division', type: 'STRING' },
    { name: 'role', type: 'STRING' },
    { name: 'email', type: 'STRING' },
    { name: 'phone', type: 'STRING' },
    { name: 'profile_id', type: 'STRING' },
  ]);
}

async function ensureTableExists(bigQuery: BigQuery, dsName: string, tableName: string, columns: TableField[]): Promise<void> {
  const dataset = bigQuery.dataset(dsName);
  const table = dataset.table(tableName);
  const [exists] = await table.exists();
  if (!exists) {
    await dataset.createTable(tableName, {
      schema: columns,
    });
  }
}

main().catch(e => console.error(e));
