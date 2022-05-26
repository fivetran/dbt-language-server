import { BigQuery, Dataset, TableField } from '@google-cloud/bigquery';
import { downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests, SilentReporter } from '@vscode/test-electron';
import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as fs from 'fs';
import { homedir } from 'os';
import * as path from 'path';
import { Client } from 'pg';

// Expected parameter: path to the folder with the extension package.json
async function main(): Promise<void> {
  try {
    try {
      await prepareBigQuery();
    } catch (err) {
      console.error(`Failed to prepare BigQuery. Error: ${err instanceof Error ? err.message : String(err)}`);
      throw new Error('Failed to prepare BigQuery.');
    }

    try {
      await preparePostgres();
    } catch (err) {
      console.error(`Failed to prepare Postgres. Error: ${err instanceof Error ? err.message : String(err)}`);
      throw new Error('Failed to prepare Postgres.');
    }

    const [, , extensionDevelopmentPath] = process.argv;
    console.log(`Running tests for path: ${extensionDevelopmentPath}`);
    const defaultCachePath = path.resolve(extensionDevelopmentPath, '.vscode-test');
    const extensionsInstallPath = path.join(defaultCachePath, 'extensions');

    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable', undefined, new SilentReporter());
    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);

    const installResult = installExtension(cli, args, 'ms-python.python', extensionsInstallPath);
    if (installResult.status !== 0) {
      console.error('Failed to install python extension from marketplace. Trying to install from open-vsx ...');

      const extensionFilePath = path.resolve(extensionsInstallPath, 'ms-python.python.vsix');
      const downloadResult = spawnSync('npx', ['ovsx', 'get', 'ms-python.python', '-o', extensionFilePath], {
        encoding: 'utf-8',
        stdio: 'inherit',
      });

      if (downloadResult.status !== 0) {
        console.error('Failed to download python extension from open-vsx.');
        process.exit(1);
      }

      const openVsxInstallResult = installExtension(cli, args, extensionFilePath, extensionsInstallPath);
      if (openVsxInstallResult.status !== 0) {
        console.error('Failed to install python extension from open-vsx.');
        process.exit(1);
      }
    }

    const extensionTestsPath = path.resolve(__dirname, './index');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      launchArgs: [path.resolve(__dirname, '../projects/test-workspace.code-workspace'), `--extensions-dir=${extensionsInstallPath}`],
      extensionTestsEnv: { CLI_PATH: cli, EXTENSIONS_INSTALL_PATH: extensionsInstallPath, DBT_LS_DISABLE_TELEMETRY: 'true' },
    });
  } catch (err) {
    console.error(`Failed to run tests. Error: ${err instanceof Error ? err.message : String(err)}`);
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

  await ensureTableExists(dataset, 'test_table1', [
    { name: 'id', type: 'INTEGER' },
    { name: 'time', type: 'TIMESTAMP' },
    { name: 'name', type: 'STRING' },
    { name: 'date', type: 'DATE' },
  ]);

  await ensureTableExists(dataset, 'users', [
    { name: 'id', type: 'INTEGER' },
    { name: 'name', type: 'STRING' },
    { name: 'division', type: 'STRING' },
    { name: 'role', type: 'STRING' },
    { name: 'email', type: 'STRING' },
    { name: 'phone', type: 'STRING' },
    { name: 'profile_id', type: 'STRING' },
    { name: 'referrer_id', type: 'INTEGER' },
  ]);

  await ensureTableExists(dataset, 'table_exists', [{ name: 'id', type: 'INTEGER' }]);
  await ensureTableWithStructExists(dataset);
}

async function ensureTableExists(dataset: Dataset, tableName: string, columns: TableField[]): Promise<void> {
  if (!(await isTableExist(dataset, tableName))) {
    await dataset.createTable(tableName, {
      schema: columns,
    });
  }
}

async function ensureTableWithStructExists(dataset: Dataset): Promise<void> {
  const tableName = 'student_details';
  if (!(await isTableExist(dataset, tableName))) {
    await dataset.createTable(tableName, {
      schema: [
        { name: 'id', type: 'INTEGER' },
        {
          name: 'info',
          type: 'RECORD',
          mode: 'REPEATED',
          fields: [
            { name: 'name', type: 'STRING' },
            { name: 'age', type: 'INTEGER' },
            {
              name: 'subjects',
              type: 'RECORD',
              fields: [
                { name: 'subj1', type: 'STRING' },
                { name: 'subj2', type: 'STRING' },
              ],
            },
          ],
        },
      ],
      timePartitioning: {
        type: 'DAY',
      },
    });
  }
}

async function isTableExist(dataset: Dataset, tableName: string): Promise<boolean> {
  const table = dataset.table(tableName);
  return (await table.exists())[0];
}

async function preparePostgres(): Promise<void> {
  const content = fs.readFileSync(`${homedir()}/.dbt/postgres.json`, 'utf8');
  const connectionParams = JSON.parse(content) as {
    user: string;
    host: string;
    dbname: string;
    password: string;
    port: number;
    schema: string;
  };

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

function installExtension(cli: string, args: string[], idOrPath: string, installPath: string): SpawnSyncReturns<string> {
  return spawnSync(cli, [...args, `--install-extension=${idOrPath}`, `--extensions-dir=${installPath}`], {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}

main().catch(e => console.error(e));
