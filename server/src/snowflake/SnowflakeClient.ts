import { err, ok, Result } from 'neverthrow';
import { Connection, Statement } from 'snowflake-sdk';
import { Dataset, DbtDestinationClient, Metadata, Table, Udf } from '../DbtDestinationClient';

export class SnowflakeClient implements DbtDestinationClient {
  constructor(public defaultProject: string, private connection: Connection) {}

  test(): Promise<Result<void, string>> {
    return this.connect().then(errorResult => (errorResult === undefined ? ok(undefined) : err(errorResult)));
  }

  /** Returns list of schemas in Snowflake terminology */
  async getDatasets(): Promise<Dataset[]> {
    await this.connectIfNeeded();
    const columnName = 'schema_name'.toUpperCase();
    const statement = this.connection.execute({
      sqlText: `select ${columnName} from information_schema.schemata order by ${columnName}`,
    });
    return this.getValues(statement, columnName);
  }

  async getTables(datasetName: string): Promise<Table[]> {
    await this.connectIfNeeded();
    const columnName = 'table_name'.toUpperCase();
    const statement = this.connection.execute({
      sqlText: `select ${columnName} from information_schema.tables where table_schema = :1 order by ${columnName}`,
      binds: [datasetName.toUpperCase()],
    });
    return this.getValues(statement, columnName);
  }

  async getTableMetadata(datasetName: string, tableName: string): Promise<Metadata | undefined> {
    await this.connectIfNeeded();
    const columnNames = ['column_name', 'data_type'];
    const statement = this.connection.execute({
      sqlText: `select ${columnNames.join(',')} from information_schema.columns where table_schema = :1 and table_name = :2`,
      binds: [datasetName.toUpperCase(), tableName.toUpperCase()],
    });

    const stream = statement.streamRows();
    let result: Metadata | undefined = undefined;
    stream.on('data', (row: { COLUMN_NAME: string; DATA_TYPE: string }) => {
      if (!result) {
        result = { schema: { fields: [] }, timePartitioning: false };
      }
      result.schema.fields.push({ name: row.COLUMN_NAME, type: row.DATA_TYPE });
    });

    return new Promise((resolve, reject) => {
      stream.on('error', e => reject(e));
      stream.on('end', () => resolve(result));
    });
  }

  async getUdf(_projectId: string | undefined, _dataSetId: string, _routineId: string): Promise<Udf | undefined> {
    await this.connectIfNeeded();
    throw new Error('Method not implemented.');
  }

  private connect(): Promise<string | undefined> {
    return new Promise<string | undefined>(resolve => {
      this.connection.connect(error => {
        if (error) {
          const errorMessage = `Connection failed. Reason: ${error.message}.`;
          console.log(errorMessage);
          resolve(errorMessage);
        }
        resolve(undefined);
      });
    });
  }

  private connectIfNeeded(): Promise<string | undefined> {
    return this.connection.isUp() ? Promise.resolve(undefined) : this.connect();
  }

  private getValues(statement: Statement, columnName: string): Promise<{ id: string }[]> {
    const stream = statement.streamRows();
    const result: { id: string }[] = [];
    stream.on('data', (row: { [key: string]: string }) => {
      result.push({ id: row[columnName] });
    });
    return new Promise((resolve, reject) => {
      stream.on('error', e => reject(e));
      stream.on('end', () => resolve(result));
    });
  }
}
