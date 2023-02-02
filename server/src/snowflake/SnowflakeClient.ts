import { err, ok, Result } from 'neverthrow';
import * as snowflake from 'snowflake-sdk';
import { Dataset, DbtDestinationClient, Metadata, Table } from '../DbtDestinationClient';

export class SnowflakeClient implements DbtDestinationClient {
  constructor(public defaultProject: string, private connection: snowflake.Connection) {}

  test(): Promise<Result<void, string>> {
    return new Promise<Result<void, string>>(resolve => {
      this.connection.connect(error => {
        if (error) {
          const errorMessage = `Test connection failed. Reason: ${error.message}.`;
          console.log(errorMessage);
          resolve(err(errorMessage));
        }
        resolve(ok(undefined));
      });
    });
  }

  getDatasets(): Promise<Dataset[]> {
    throw new Error('Method getDatasets not implemented.');
  }

  getTables(_datasetName: string, _projectName?: string | undefined): Promise<Table[]> {
    throw new Error('Method getTables not implemented.');
  }

  getTableMetadata(_datasetName: string, _tableName: string): Promise<Metadata | undefined> {
    throw new Error('Method getTableMetadata not implemented.');
  }
}
