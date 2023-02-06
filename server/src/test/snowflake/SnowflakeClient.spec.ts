import { assertThat, hasItem, hasItems } from 'hamjest';
import { ok } from 'node:assert';
import { PassThrough } from 'node:stream';
import { setTimeout } from 'node:timers/promises';
import { Connection, createConnection, Statement } from 'snowflake-sdk';
import { deepEqual, instance, mock, when } from 'ts-mockito';
import { SnowflakeClient } from '../../snowflake/SnowflakeClient';

describe.skip('SnowflakeClient tests with real credentials', () => {
  it('Should pass test', async () => {
    // arrange
    const client = createClient();

    // act
    const result = await client.test();

    // assert
    ok(result.isOk());
  });

  it('Should return list of databases', async () => {
    // arrange
    const client = createClient();

    // act
    const result = await client.getDatasets();

    // assert
    assertThat(result, hasItem({ id: 'DBT_LS_E2E_DATASET' }));
  });

  it('Should return list of tables', async () => {
    // arrange
    const client = createClient();

    // act
    const result = await client.getTables('DBT_LS_E2E_DATASET');

    // assert
    assertThat(result, hasItem({ id: 'TEST_TABLE1' }));
  });

  it('Should return metadata', async () => {
    // arrange
    const client = createClient();

    // act
    const result = await client.getTableMetadata('DBT_LS_E2E_DATASET', 'TEST_TABLE1');

    // assert
    assertThat(result?.schema.fields, hasItem({ name: 'TIME', type: 'TIMESTAMP_NTZ' }));
  });
});

describe('SnowflakeClient', () => {
  it('getTableMetadata should return correct result', async () => {
    // arrange
    const datasetName = 'DBT_LS_E2E_DATASET';
    const tableName = 'test_table1';

    const mockStream = new PassThrough();

    const mockStatement = mock<Statement>();
    when(mockStatement.streamRows()).thenReturn(mockStream);

    const mockConnection: Connection = mock<Connection>();
    when(
      mockConnection.execute(
        deepEqual({
          sqlText: 'select column_name,data_type from information_schema.columns where table_schema = :1 and table_name = :2',
          binds: [datasetName.toUpperCase(), tableName.toUpperCase()],
        }),
      ),
    ).thenReturn(instance(mockStatement));

    const client = new SnowflakeClient('project', instance(mockConnection));
    client['connect'] = (): Promise<string | undefined> => Promise.resolve(undefined);

    // act
    const promise = client.getTableMetadata(datasetName, tableName);

    await setTimeout(0);
    mockStream.emit('data', { COLUMN_NAME: 'column1', DATA_TYPE: 'string' });
    mockStream.emit('data', { COLUMN_NAME: 'column2', DATA_TYPE: 'TIMESTAMP_NTZ' });
    mockStream.end();
    mockStream.destroy();

    const result = await promise;

    // assert
    assertThat(result?.schema.fields, hasItems({ name: 'column1', type: 'string' }, { name: 'column2', type: 'TIMESTAMP_NTZ' }));
  });
});

function createClient(): SnowflakeClient {
  const options = {
    account: '',
    username: '',
    password: '',
    warehouse: '',
    database: '',
  };
  const connection = createConnection(options);
  return new SnowflakeClient(options.database, connection);
}
