import { BigQuery, Dataset, TableField } from '@google-cloud/bigquery';
import { SilentReporter, downloadAndUnzipVSCode, resolveCliArgsFromVSCodeExecutablePath, runTests } from '@vscode/test-electron';
import { SpawnSyncReturns, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import { homedir } from 'node:os';
import * as path from 'node:path';
import { Client } from 'pg';
import { SnowflakeError, Statement, createConnection } from 'snowflake-sdk';

// Expected parameter: path to the folder with the extension package.json
export async function installVsCodeAndRunTests(indexName: string, projectWithModelsPath: string): Promise<void> {
  try {
    const testsPath = path.resolve(__dirname, indexName);
    const extensionDevelopmentPath = process.argv[2];
    console.log(`Running tests for path: ${extensionDevelopmentPath}`);
    console.log(`Project path: ${projectWithModelsPath}`);

    const defaultCachePath = path.resolve(extensionDevelopmentPath, '.vscode-test');
    const extensionsInstallPath = path.join(defaultCachePath, 'extensions');
    console.log('extensionsInstallPath resolved');

    const vscodeExecutablePath = await downloadAndUnzipVSCode('stable', undefined, new SilentReporter());
    console.log(`Extension successfully downloaded and unzipped to ${vscodeExecutablePath}`);
    const [cli, ...args] = resolveCliArgsFromVSCodeExecutablePath(vscodeExecutablePath);
    console.log('cli and args resolved');

    const installResult = installExtension(cli, args, 'ms-python.python', extensionsInstallPath);
    if (installResult.status !== 0) {
      console.error('Failed to install python extension from marketplace. Trying to install from open-vsx ...');

      const extensionFilePath = path.resolve(extensionsInstallPath, 'ms-python.python.vsix');
      const downloadResult = spawnSync('npx', ['ovsx', 'get', '-t', 'latest', '-o', extensionFilePath, 'ms-python.python'], {
        encoding: 'utf8',
        stdio: 'inherit',
      });

      if (downloadResult.status !== 0) {
        throw new Error('Failed to download python extension from open-vsx.');
      }

      const openVsxInstallResult = installExtension(cli, args, extensionFilePath, extensionsInstallPath);
      if (openVsxInstallResult.status !== 0) {
        throw new Error('Failed to install python extension from open-vsx.');
      }
    }
    console.log('Python extension successfully installed from marketplace');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath: testsPath,
      launchArgs: [projectWithModelsPath, `--extensions-dir=${extensionsInstallPath}`],
      extensionTestsEnv: {
        CLI_PATH: cli,
        EXTENSIONS_INSTALL_PATH: extensionsInstallPath,
        DBT_LS_DISABLE_TELEMETRY: 'true',
        DBT_LS_ENABLE_DEBUG_LOGS: 'true',
      },
    });
    /* eslint-disable-next-line unicorn/no-process-exit */
    process.exit(0);
  } catch (e) {
    console.log(`Failed to run tests. Error: ${e instanceof Error ? e.message : String(e)}`);
    if (e instanceof Error && e.stack) {
      console.log(e.stack);
    }
    /* eslint-disable-next-line unicorn/no-process-exit */
    process.exit(1);
  }
}

export async function prepareBigQuery(): Promise<void> {
  const options = {
    keyFilename: `${homedir()}/.dbt/bq-test-project.json`,
    projectId: 'singular-vector-135519',
    autoRetry: true,
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
  await ensureUdfExists(dataset);
  await ensureExternalTableExists(dataset);
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

async function ensureExternalTableExists(dataset: Dataset): Promise<void> {
  const tableName = 'external_table';
  if (!(await isTableExist(dataset, tableName))) {
    await dataset.createTable(tableName, {
      type: 'EXTERNAL',
      externalDataConfiguration: {
        sourceUris: ['https://storage.googleapis.com/dbt-language-server-e2e/1.csv'],
        sourceFormat: 'CSV',
        autodetect: true,
      },
    });
  }
}

async function ensureUdfExists(dataset: Dataset): Promise<void> {
  const routine = dataset.routine('my_custom_sum');
  const existsResult = await routine.exists();
  if (!existsResult[0]) {
    await routine.create({
      arguments: [
        {
          name: 'x',
          dataType: {
            typeKind: 'INT64',
          },
        },
        {
          name: 'y',
          dataType: {
            typeKind: 'INT64',
          },
        },
      ],
      definitionBody: 'x * y',
      routineType: 'SCALAR_FUNCTION',
      returnType: {
        typeKind: 'INT64',
      },
    });
  }
}

async function isTableExist(dataset: Dataset, tableName: string): Promise<boolean> {
  const table = dataset.table(tableName);
  const existsResult = await table.exists();
  return existsResult[0];
}

export async function preparePostgres(): Promise<void> {
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

export async function prepareSnowflake(): Promise<void> {
  const content = fs.readFileSync(`${homedir()}/.dbt/snowflake.json`, 'utf8');
  const connectionParams = JSON.parse(content) as {
    account: string;
    username: string;
    password: string;
    database: string;
    warehouse: string;
  };

  const connection = createConnection(connectionParams);
  await new Promise<void>((resolve, reject) => {
    connection.connect(error => {
      if (error) {
        const errorMessage = `Connection to Snowflake failed. Reason: ${error.message}.`;
        console.log(errorMessage);
        reject(error);
      }
      resolve();
    });
  });

  await new Promise<void>((resolve, reject) => {
    const options = {
      parameters: { MULTI_STATEMENT_COUNT: 4 }, // Missing in @types/snowflake-sdk
      sqlText: `create database if not exists e2e_db;
      create schema if not exists dbt_ls_e2e_dataset;
      create table if not exists dbt_ls_e2e_dataset.test_table1(
        id INTEGER,
        time TIMESTAMP,
        name STRING,
        date DATE
      );
      create table if not exists dbt_ls_e2e_dataset.users(
      id INTEGER,
        name STRING,
        division STRING,
        role STRING,
        email STRING,
        phone STRING,
        profile_id STRING,
        referrer_id STRING
      );`,

      complete: (err: SnowflakeError | undefined, stmt: Statement, _rows: unknown[] | undefined): void => {
        if (err) {
          reject(err);
        }
        const stream = stmt.streamRows();
        stream.on('error', e => reject(e));
        stream.on('data', row => console.log(row));
        stream.on('end', () => resolve());
      },
    };

    connection.execute(options);
  });
}

function installExtension(cli: string, args: string[], idOrPath: string, installPath: string): SpawnSyncReturns<string> {
  return spawnSync(cli, [...args, `--install-extension=${idOrPath}`, `--extensions-dir=${installPath}`], {
    encoding: 'utf8',
    stdio: 'inherit',
  });
}
