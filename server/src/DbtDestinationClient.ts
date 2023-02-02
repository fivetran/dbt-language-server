import { Result } from 'neverthrow';
import { SchemaDefinition } from './TableDefinition';

export interface DbtDestinationClient {
  /**
   * Tests connection to destination
   * @returns Ok in case of connection successful and Err otherwise
   */
  test(): Promise<Result<void, string>>;

  getDatasets(): Promise<Dataset[]>;

  getTables(datasetName: string, projectName?: string): Promise<Table[]>;

  getTableMetadata(datasetName: string, tableName: string): Promise<Metadata | undefined>;

  /** default project (`project` value of BigQuery config, `database` value for Snowflake config) */
  defaultProject: string;
}

export interface Dataset {
  id: string;
}

export interface Table {
  id: string;
}

export interface Metadata {
  schema: SchemaDefinition;
  timePartitioning: boolean;
}
