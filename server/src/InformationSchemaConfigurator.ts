import { SimpleCatalog, SimpleTable } from '@fivetrandevelopers/zetasql';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import { NewZetaSqlWrapper } from './NewZetaSqlWrapper';
import { TableDefinition } from './TableDefinition';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

export class InformationSchemaConfigurator {
  static readonly INFORMATION_SCHEMA = 'information_schema';

  /** https://cloud.google.com/bigquery/docs/information-schema-intro */
  static readonly INFORMATION_SCHEMA_COLUMNS = new Map<string, Map<string, string>>([
    [
      'tables',
      new Map<string, string>([
        ['table_catalog', 'string'],
        ['table_schema', 'string'],
        ['table_name', 'string'],
        ['table_type', 'string'],
        ['is_insertable_into', 'string'],
        ['is_typed', 'string'],
        ['creation_time', 'timestamp'],
        ['ddl', 'string'],
        ['clone_time', 'timestamp'],
        ['base_table_catalog', 'string'],
        ['base_table_schema', 'string'],
        ['base_table_name', 'string'],
        ['default_collation_name', 'string'],
      ]),
    ],
    [
      'table_options',
      new Map<string, string>([
        ['table_catalog', 'string'],
        ['table_schema', 'string'],
        ['table_name', 'string'],
        ['option_name', 'string'],
        ['option_type', 'string'],
        ['option_value', 'string'],
      ]),
    ],
    [
      'columns',
      new Map<string, string>([
        ['table_catalog', 'string'],
        ['table_schema', 'string'],
        ['table_name', 'string'],
        ['column_name', 'string'],
        ['ordinal_position', 'int64'],
        ['is_nullable', 'string'],
        ['data_type', 'string'],
        ['is_generated', 'string'],
        ['is_generated', 'string'],
        ['generation_expression', 'string'],
        ['is_stored', 'string'],
        ['is_hidden', 'string'],
        ['is_updatable', 'string'],
        ['is_system_defined', 'string'],
        ['is_partitioning_column', 'string'],
        ['clustering_ordinal_position', 'int64'],
        ['collation_name', 'string'],
      ]),
    ],
    [
      'column_field_paths',
      new Map<string, string>([
        ['table_catalog', 'string'],
        ['table_schema', 'string'],
        ['table_name', 'string'],
        ['column_name', 'string'],
        ['field_path', 'string'],
        ['data_type', 'string'],
        ['description', 'string'],
        ['collation_name', 'string'],
      ]),
    ],
    [
      'partitions',
      new Map<string, string>([
        ['table_catalog', 'string'],
        ['table_schema', 'string'],
        ['table_name', 'string'],
        ['partition_id', 'string'],
        ['total_rows', 'integer'],
        ['total_logical_bytes', 'integer'],
        ['total_billable_bytes', 'integer'],
        ['last_modified_time', 'timestamp'],
        ['storage_tier', 'string'],
      ]),
    ],
    [
      'table_storage',
      new Map<string, string>([
        ['project_id', 'string'],
        ['project_name', 'int64'],
        ['table_schema', 'string'],
        ['table_name', 'string'],
        ['creation_time', 'timestamp'],
        ['total_rows', 'int64'],
        ['total_partitions', 'int64'],
        ['total_logical_bytes', 'int64'],
        ['active_logical_bytes', 'int64'],
        ['long_term_logical_bytes', 'int64'],
        ['total_physical_bytes', 'int64'],
        ['active_physical_bytes', 'int64'],
        ['long_term_physical_bytes', 'int64'],
        ['time_travel_physical_bytes', 'int64'],
      ]),
    ],
  ]);

  static {
    ['jobs_by_user', 'jobs_by_project', 'jobs_by_folder', 'jobs_by_organization'].forEach(tableName => {
      InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.set(
        tableName,
        new Map<string, string>([
          ['creation_time', 'timestamp'],
          ['project_id', 'timestamp'],
          ['project_number', 'integer'],
          ['folder_numbers', 'integer'],
          ['user_email', 'string'],
          ['job_id', 'string'],
          ['job_type', 'string'],
          ['statement_type', 'string'],
          ['priority', 'string'],
          ['start_time', 'timestamp'],
          ['end_time', 'timestamp'],
          ['query', 'string'],
          ['state', 'string'],
          ['reservation_id', 'string'],
          ['total_bytes_processed', 'integer'],
          ['total_slot_ms', 'integer'],
          ['error_result', 'record'],
          ['cache_hit', 'boolean'],
          ['destination_table', 'record'],
          ['referenced_tables', 'record'],
          ['labels', 'record'],
          ['timeline', 'record'],
          ['job_stages', 'record'],
          ['total_bytes_billed', 'integer'],
          ['parent_job_id', 'string'],
          ['transaction_id', 'string'],
          ['session_info', 'record'],
          ['dml_statistics', 'record'],
          ['bi_engine_statistics', 'record'],
          ['total_modified_partitions', 'integer'],
        ]),
      );
    });
  }

  fillInformationSchema(tableDefinition: TableDefinition, dataSetCatalog: SimpleCatalog): void {
    let informationSchemaCatalog = dataSetCatalog.catalogs.get(InformationSchemaConfigurator.INFORMATION_SCHEMA);
    if (!informationSchemaCatalog) {
      informationSchemaCatalog = new SimpleCatalog(InformationSchemaConfigurator.INFORMATION_SCHEMA);
      dataSetCatalog.addSimpleCatalog(informationSchemaCatalog);
    }
    this.addInformationSchemaTableColumns(tableDefinition.getTableName(), informationSchemaCatalog);
  }

  addInformationSchemaTableColumns(tableName: string, informationSchemaCatalog: SimpleCatalog): void {
    const tableDefinition = InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.get(tableName);
    if (tableDefinition && !informationSchemaCatalog.tables.has(tableName)) {
      const table = new SimpleTable(tableName);
      informationSchemaCatalog.addSimpleTable(tableName, table);
      tableDefinition.forEach((type, name) => ZetaSqlWrapper.addColumn(table, { name, type }, tableName));
    }
  }

  fillInformationSchema2(tableDefinition: TableDefinition, dataSetCatalog: SimpleCatalogProto): void {
    let informationSchemaCatalog = dataSetCatalog.catalog?.find(c => c.name === InformationSchemaConfigurator.INFORMATION_SCHEMA);
    if (!informationSchemaCatalog) {
      informationSchemaCatalog = {
        name: InformationSchemaConfigurator.INFORMATION_SCHEMA,
      };
      dataSetCatalog.catalog = dataSetCatalog.catalog ?? [];
      dataSetCatalog.catalog.push(informationSchemaCatalog);
    }
    this.addInformationSchemaTableColumns2(tableDefinition.getTableName(), informationSchemaCatalog);
  }

  addInformationSchemaTableColumns2(tableName: string, informationSchemaCatalog: SimpleCatalogProto): void {
    const tableDefinition = InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.get(tableName);
    if (tableDefinition && !informationSchemaCatalog.table?.find(t => t.name === tableName)) {
      const table = {
        name: tableName,
      };
      informationSchemaCatalog.table = informationSchemaCatalog.table ?? [];
      informationSchemaCatalog.table.push(table);
      tableDefinition.forEach((type, name) =>
        NewZetaSqlWrapper.addColumn(table, NewZetaSqlWrapper.createSimpleColumn(name, NewZetaSqlWrapper.createType({ name, type }))),
      );
    }
  }
}
