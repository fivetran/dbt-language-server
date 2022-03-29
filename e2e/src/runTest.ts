import { BigQuery, TableField } from '@google-cloud/bigquery';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests, SilentReporter } from '@vscode/test-electron';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import { homedir } from 'os';
import * as path from 'path';
import { Client } from 'pg';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  try {
    await prepareBigQuery();
    await preparePostgres();

    const [, , extensionDevelopmentPath] = process.argv;
    console.log(`Running tests for path: ${extensionDevelopmentPath}`);
    const defaultCachePath = path.resolve(extensionDevelopmentPath, '.vscode-test');
    const extensionsInstallPath = path.join(defaultCachePath, 'extensions');

    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable', undefined, new SilentReporter());

    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    const installResult = spawnSync(cli, [...args, '--install-extension=ms-python.python', `--extensions-dir=${extensionsInstallPath}`], {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    if (installResult.status !== 0) {
      console.error('Failed to install python extension');
      process.exit(1);
    }

    const extensionTestsPath = path.resolve(__dirname, './index');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [path.resolve(__dirname, '../projects/test-workspace.code-workspace'), `--extensions-dir=${extensionsInstallPath}`],
      extensionTestsEnv: { CLI_PATH: cli, EXTENSIONS_INSTALL_PATH: extensionsInstallPath, DBT_LS_DISABLE_TELEMETRY: 'true' },
    });
  } catch (err) {
    console.error(`Failed to run tests. Error: ${err}`);
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

  await ensureTableExists(bigQuery, dsName, 'table_exists', [{ name: 'id', type: 'INTEGER' }]);
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

async function preparePostgres(): Promise<void> {
  const content = fs.readFileSync(`${homedir()}/.dbt/postgres.json`, 'utf8');
  const connectionParams = JSON.parse(content);

  const client = new Client({
    user: connectionParams.user,
    host: connectionParams.host,
    database: connectionParams.dbname,
    password: connectionParams.password,
    port: connectionParams.port,
  });

  const recreateUsersTableQuery =
    `drop table if exists ${connectionParams.schema}.users;` +
    `create table if not exists ${connectionParams.schema}.users(` +
    ' id bigserial primary key,' +
    ' full_name text not null,' +
    ' city text not null,' +
    ' country text not null' +
    ');';
  const recreateOrdersTableQuery =
    `drop table if exists ${connectionParams.schema}.orders;` +
    `create table if not exists ${connectionParams.schema}.orders(` +
    ' id bigserial primary key,' +
    ' user_id bigserial,' +
    ' order_date date not null' +
    ');';

  await client.connect();
  await client.query(recreateUsersTableQuery);
  await client.query(recreateOrdersTableQuery);
  await client.end();
}

main().catch(e => console.error(e));
