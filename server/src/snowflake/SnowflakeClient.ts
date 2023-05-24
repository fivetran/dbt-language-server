import { TypeKind } from '@fivetrandevelopers/zetasql-snowflake';
import { err, ok, Result } from 'neverthrow';
import { Connection, Statement } from 'snowflake-sdk';
import { Dataset, DbtDestinationClient, Metadata, Table, Udf, UdfArgument } from '../DbtDestinationClient';
import { runWithTimeout } from '../utils/Utils';

export class SnowflakeClient implements DbtDestinationClient {
  private static readonly TIMEOUT_ERROR = 'Snowflake query timeout';
  private static readonly SQL_TIMEOUT = 10_000;

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

    return runWithTimeout(
      new Promise((resolve, reject) => {
        stream.on('error', e => reject(e));
        stream.on('end', () => resolve(result));
      }),
      SnowflakeClient.SQL_TIMEOUT,
      SnowflakeClient.TIMEOUT_ERROR,
    );
  }

  async getUdf(projectId: string | undefined, schemaName: string, routineId: string): Promise<Udf[]> {
    await this.connectIfNeeded();
    const functionCatalogCondition = projectId ? `function_catalog='${projectId.toUpperCase()}' and ` : '';
    const sqlText = `
      select 
          function_catalog,
          function_schema,
          function_name,
          argument_signature as arguments,
          data_type as return_type
      from information_schema.functions
      where ${functionCatalogCondition}function_schema='${schemaName.toUpperCase()}' and function_name='${routineId.toUpperCase()}';
    `;
    console.log(sqlText);
    const statement = this.connection.execute({ sqlText });

    const stream = statement.streamRows();
    const results: Udf[] = [];
    stream.on('data', (row: { ARGUMENTS: string; RETURN_TYPE: string }) => {
      const nameParts = [schemaName, routineId];
      if (projectId) {
        nameParts.splice(0, 0, projectId);
      }
      const typeKind = SnowflakeClient.toTypeKind(row.RETURN_TYPE.split('(')[0]);
      const args = this.getArgumentTypes(row.ARGUMENTS).map<UdfArgument>(a => ({
        type: {
          typeKind: SnowflakeClient.toTypeKind(a),
        },
      }));
      results.push({ nameParts, returnType: { typeKind }, arguments: args });
    });

    return runWithTimeout(
      new Promise((resolve, reject) => {
        stream.on('error', e => reject(e));
        stream.on('end', () => resolve(results));
      }),
      SnowflakeClient.SQL_TIMEOUT,
      SnowflakeClient.TIMEOUT_ERROR,
    );
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

    return runWithTimeout(
      new Promise((resolve, reject) => {
        stream.on('error', e => reject(e));
        stream.on('end', () => resolve(result));
      }),
      SnowflakeClient.SQL_TIMEOUT,
      SnowflakeClient.TIMEOUT_ERROR,
    );
  }

  private static toTypeKind(stringType?: string): TypeKind {
    switch (stringType?.toUpperCase()) {
      case 'NUMBER':
      case 'DECIMAL':
      case 'NUMERIC': {
        return TypeKind.TYPE_NUMERIC;
      }
      case 'INT':
      case 'INTEGER':
      case 'BIGINT':
      case 'SMALLINT':
      case 'TINYINT':
      case 'BYTEINT': {
        return TypeKind.TYPE_INT64;
      }
      case 'BOOLEAN': {
        return TypeKind.TYPE_BOOL;
      }
      case 'FLOAT':
      case 'FLOAT4':
      case 'FLOAT8':
      case 'DOUBLE':
      case 'DOUBLE PRECISION':
      case 'REAL': {
        return TypeKind.TYPE_FLOAT;
      }
      case 'STRING':
      case 'TEXT':
      case 'VARCHAR':
      case 'CHAR':
      case 'CHARACTER': {
        return TypeKind.TYPE_STRING;
      }
      case 'BINARY':
      case 'VARBINARY': {
        return TypeKind.TYPE_BYTES;
      }
      case 'DATE': {
        return TypeKind.TYPE_DATE;
      }
      case 'TIME': {
        return TypeKind.TYPE_TIME;
      }
      case 'TIMESTAMP':
      case 'TIMESTAMP_LTZ':
      case 'TIMESTAMP_NTZ':
      case 'TIMESTAMP_TZ':
      case 'DATETIME': {
        return TypeKind.TYPE_TIMESTAMP;
      }
      case 'OBJECT': {
        return TypeKind.TYPE_STRUCT;
      }
      case 'ARRAY': {
        return TypeKind.TYPE_ARRAY;
      }

      default: {
        return TypeKind.TYPE_UNKNOWN;
      }
    }
  }

  getArgumentTypes(signature: string): string[] {
    return signature
      .slice(1, -1)
      .split(',')
      .map(a => a.trim().split(' ')[1]);
  }
}
