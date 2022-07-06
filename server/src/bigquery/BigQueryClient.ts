import { TypeKind } from '@fivetrandevelopers/zetasql';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { BigQuery, DatasetsResponse, RoutineMetadata, TableMetadata } from '@google-cloud/bigquery';
import { err, ok, Result } from 'neverthrow';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { SchemaDefinition } from '../TableDefinition';
import { BigQueryTypeKind, IStandardSqlDataType } from './BigQueryLibraryTypes';

export interface Metadata {
  schema: SchemaDefinition;
  timePartitioning: boolean;
}

export interface Udf {
  nameParts: string[];
  arguments?: UdfArgument[];
  returnType?: TypeProto;
}

export interface UdfArgument {
  name?: string;
  type: TypeProto;
  argumentKind?: 'ARGUMENT_KIND_UNSPECIFIED' | 'FIXED_TYPE' | 'ANY_TYPE';
}

export class BigQueryClient implements DbtDestinationClient {
  static readonly BQ_TEST_CLIENT_DATASETS_LIMIT = 1;

  project: string;
  bigQuery: BigQuery;

  constructor(project: string, bigQuery: BigQuery) {
    this.project = project;
    this.bigQuery = bigQuery;
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

  async getDatasets(maxResults?: number): Promise<DatasetsResponse> {
    return this.bigQuery.getDatasets({ maxResults });
  }

  async getTableMetadata(dataSet: string, tableName: string): Promise<Metadata | undefined> {
    const dataset = this.bigQuery.dataset(dataSet);
    const table = dataset.table(tableName);
    try {
      const [metadata] = (await table.getMetadata()) as [TableMetadata, unknown];
      return {
        schema: metadata.schema as SchemaDefinition,
        timePartitioning: metadata.timePartitioning !== undefined,
      };
    } catch (e) {
      console.log(`error while getting table metadata: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    }
  }

  async getUdf(projectId: string | undefined, dataSetId: string, routineId: string): Promise<Udf | undefined> {
    const dataSet = this.bigQuery.dataset(dataSetId, { projectId });

    try {
      if ((await dataSet.exists()) === [false]) {
        return undefined;
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
      return udf;
    } catch (e) {
      console.log(`Error while getting UDF metadata: ${e instanceof Error ? e.message : ''}`);
    }
    return undefined;
  }

  static toTypeProto(dataType?: IStandardSqlDataType): TypeProto {
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

  static toTypeKind(bigQueryTypeKind?: BigQueryTypeKind): TypeKind {
    switch (bigQueryTypeKind) {
      case 'TYPE_KIND_UNSPECIFIED':
        return TypeKind.TYPE_UNKNOWN;
      case 'INT64':
        return TypeKind.TYPE_INT64;
      case 'BOOL':
        return TypeKind.TYPE_BOOL;
      case 'FLOAT64':
        return TypeKind.TYPE_FLOAT;
      case 'STRING':
        return TypeKind.TYPE_STRING;
      case 'BYTES':
        return TypeKind.TYPE_BYTES;
      case 'TIMESTAMP':
        return TypeKind.TYPE_TIMESTAMP;
      case 'DATE':
        return TypeKind.TYPE_DATE;
      case 'TIME':
        return TypeKind.TYPE_TIME;
      case 'DATETIME':
        return TypeKind.TYPE_DATETIME;
      case 'INTERVAL':
        return TypeKind.TYPE_INTERVAL;
      case 'GEOGRAPHY':
        return TypeKind.TYPE_GEOGRAPHY;
      case 'NUMERIC':
        return TypeKind.TYPE_NUMERIC;
      case 'BIGNUMERIC':
        return TypeKind.TYPE_BIGNUMERIC;
      case 'JSON':
        return TypeKind.TYPE_JSON;
      case 'ARRAY':
        return TypeKind.TYPE_ARRAY;
      case 'STRUCT':
        return TypeKind.TYPE_STRUCT;
      default:
        return TypeKind.TYPE_UNKNOWN;
    }
  }
}
