import { TypeKind } from '@fivetrandevelopers/zetasql';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { BigQuery, Dataset as BqDataset, RoutineMetadata, TableMetadata } from '@google-cloud/bigquery';
import { Result, err, ok } from 'neverthrow';
import { Dataset, DbtDestinationClient, Metadata, SchemaDefinition, Table, Udf, UdfArgument } from '../DbtDestinationClient';
import { BigQueryTypeKind, IStandardSqlDataType } from './BigQueryLibraryTypes';

export class BigQueryClient implements DbtDestinationClient {
  private static readonly BQ_TEST_CLIENT_DATASETS_LIMIT = 1;
  private static readonly REQUESTED_SCHEMA_FIELDS = ['schema', 'timePartitioning', 'type'] as const;
  private static readonly JOINED_FIELDS = BigQueryClient.REQUESTED_SCHEMA_FIELDS.join(',');

  bigQuery: BigQuery;

  constructor(
    public defaultProject: string,
    private updateCredentials: () => BigQuery,
  ) {
    this.bigQuery = this.updateCredentials();
  }

  async test(): Promise<Result<void, string>> {
    try {
      await this.getDatasets(BigQueryClient.BQ_TEST_CLIENT_DATASETS_LIMIT);
    } catch (e) {
      const message = `Test connection failed. Reason: ${e instanceof Error ? e.message : String(e)}.`;
      console.log(message);
      return err(message);
    }

    return ok(undefined);
  }

  async getDatasets(maxResults?: number): Promise<Dataset[]> {
    return this.executeOperation(async () => {
      const [bigQueryResult] = await this.bigQuery.getDatasets({ maxResults });
      return bigQueryResult.map(d => ({ id: d.id })).filter((d): d is { id: string } => d.id !== undefined);
    });
  }

  async getTables(datasetName: string, projectName?: string): Promise<Table[]> {
    return this.executeOperation(async () => {
      const [tables] = await new BqDataset(this.bigQuery, datasetName, { projectId: projectName }).getTables();
      return tables.map(t => ({ id: t.id })).filter((t): t is { id: string } => t.id !== undefined);
    });
  }

  async getTableMetadata(datasetName: string, tableName: string): Promise<Metadata | undefined> {
    try {
      return await this.executeOperation(async () => {
        const dataset = this.bigQuery.dataset(datasetName);
        const table = dataset.table(tableName);
        const [metadata] = (await table.getMetadata({
          fields: BigQueryClient.JOINED_FIELDS,
        })) as [Pick<TableMetadata, (typeof BigQueryClient.REQUESTED_SCHEMA_FIELDS)[number]>, unknown];
        return {
          schema: metadata.schema as SchemaDefinition,
          timePartitioning: metadata.timePartitioning !== undefined,
          type: metadata.type,
        };
      });
    } catch (e) {
      console.log(`error while getting table metadata: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    }
  }

  async getUdf(projectId: string | undefined, dataSetId: string, routineId: string): Promise<Udf[]> {
    try {
      return await this.executeOperation(async () => {
        const dataSet = this.bigQuery.dataset(dataSetId, { projectId });

        const existsResult = await dataSet.exists();
        if (!existsResult[0]) {
          return [];
        }

        const [metadata] = (await dataSet.routine(routineId).getMetadata()) as [RoutineMetadata, unknown];
        const nameParts = [dataSetId, routineId];
        if (projectId) {
          nameParts.splice(0, 0, projectId);
        }
        const udf: Udf = { nameParts };
        if (metadata.arguments) {
          udf.arguments = metadata.arguments.map<UdfArgument>(a => ({
            name: a.name,
            type: BigQueryClient.toTypeProto(a.dataType),
            argumentKind: a.argumentKind,
          }));
        }
        if (metadata.returnType) {
          udf.returnType = BigQueryClient.toTypeProto(metadata.returnType);
        }
        return [udf];
      });
    } catch (e) {
      console.log(`Error while getting UDF metadata: ${e instanceof Error ? e.message : ''}`);
      return [];
    }
  }

  private async executeOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (e) {
      if (e instanceof Object) {
        if (('code' in e && (e.code === 401 || e.code === '401')) || ('message' in e && e.message === 'invalid_grant')) {
          this.bigQuery = this.updateCredentials();
          return await operation();
        }
        throw e;
      } else {
        throw e;
      }
    }
  }

  private static toTypeProto(dataType?: IStandardSqlDataType): TypeProto {
    if (!dataType) {
      return {};
    }
    const type: TypeProto = {};
    type.typeKind = BigQueryClient.toTypeKind(dataType.typeKind);
    if (dataType.structType) {
      type.structType = {
        field: dataType.structType.fields?.map(f => ({ fieldName: f.name, fieldType: BigQueryClient.toTypeProto(f.type) })),
      };
    }
    if (dataType.arrayElementType) {
      type.arrayType = {
        elementType: BigQueryClient.toTypeProto(dataType.arrayElementType),
      };
    }
    return type;
  }

  private static toTypeKind(bigQueryTypeKind?: BigQueryTypeKind): TypeKind {
    switch (bigQueryTypeKind) {
      case 'TYPE_KIND_UNSPECIFIED': {
        return TypeKind.TYPE_UNKNOWN;
      }
      case 'INT64': {
        return TypeKind.TYPE_INT64;
      }
      case 'BOOL': {
        return TypeKind.TYPE_BOOL;
      }
      case 'FLOAT64': {
        return TypeKind.TYPE_FLOAT;
      }
      case 'STRING': {
        return TypeKind.TYPE_STRING;
      }
      case 'BYTES': {
        return TypeKind.TYPE_BYTES;
      }
      case 'TIMESTAMP': {
        return TypeKind.TYPE_TIMESTAMP;
      }
      case 'DATE': {
        return TypeKind.TYPE_DATE;
      }
      case 'TIME': {
        return TypeKind.TYPE_TIME;
      }
      case 'DATETIME': {
        return TypeKind.TYPE_DATETIME;
      }
      case 'INTERVAL': {
        return TypeKind.TYPE_INTERVAL;
      }
      case 'GEOGRAPHY': {
        return TypeKind.TYPE_GEOGRAPHY;
      }
      case 'NUMERIC': {
        return TypeKind.TYPE_NUMERIC;
      }
      case 'BIGNUMERIC': {
        return TypeKind.TYPE_BIGNUMERIC;
      }
      case 'JSON': {
        return TypeKind.TYPE_JSON;
      }
      case 'ARRAY': {
        return TypeKind.TYPE_ARRAY;
      }
      case 'STRUCT': {
        return TypeKind.TYPE_STRUCT;
      }
      default: {
        return TypeKind.TYPE_UNKNOWN;
      }
    }
  }
}
