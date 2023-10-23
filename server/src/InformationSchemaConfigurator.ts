import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import { ColumnDefinition } from './DbtDestinationClient';
import { TableDefinition } from './TableDefinition';
import { ZetaSqlApi } from './ZetaSqlApi';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

export class InformationSchemaConfigurator {
  static readonly INFORMATION_SCHEMA = 'information_schema';

  constructor(private zetaSqlApi: ZetaSqlApi) {}

  static createColumnDefinition(name: string, type: string, fields?: ColumnDefinition[], mode?: 'repeated'): ColumnDefinition {
    return { name, type, fields, mode };
  }

  /** https://cloud.google.com/bigquery/docs/information-schema-intro */
  static readonly INFORMATION_SCHEMA_COLUMNS = new Map<string, ColumnDefinition[]>([
    [
      'tables',
      [
        this.createColumnDefinition('table_catalog', 'string'),
        this.createColumnDefinition('table_schema', 'string'),
        this.createColumnDefinition('table_name', 'string'),
        this.createColumnDefinition('table_type', 'string'),
        this.createColumnDefinition('is_insertable_into', 'string'),
        this.createColumnDefinition('is_typed', 'string'),
        this.createColumnDefinition('creation_time', 'timestamp'),
        this.createColumnDefinition('ddl', 'string'),
        this.createColumnDefinition('clone_time', 'timestamp'),
        this.createColumnDefinition('base_table_catalog', 'string'),
        this.createColumnDefinition('base_table_schema', 'string'),
        this.createColumnDefinition('base_table_name', 'string'),
        this.createColumnDefinition('default_collation_name', 'string'),
      ],
    ],
    [
      'table_options',
      [
        this.createColumnDefinition('table_catalog', 'string'),
        this.createColumnDefinition('table_schema', 'string'),
        this.createColumnDefinition('table_name', 'string'),
        this.createColumnDefinition('option_name', 'string'),
        this.createColumnDefinition('option_type', 'string'),
        this.createColumnDefinition('option_value', 'string'),
      ],
    ],
    [
      'columns',
      [
        this.createColumnDefinition('table_catalog', 'string'),
        this.createColumnDefinition('table_schema', 'string'),
        this.createColumnDefinition('table_name', 'string'),
        this.createColumnDefinition('column_name', 'string'),
        this.createColumnDefinition('ordinal_position', 'int64'),
        this.createColumnDefinition('is_nullable', 'string'),
        this.createColumnDefinition('data_type', 'string'),
        this.createColumnDefinition('is_generated', 'string'),
        this.createColumnDefinition('generation_expression', 'string'),
        this.createColumnDefinition('is_stored', 'string'),
        this.createColumnDefinition('is_hidden', 'string'),
        this.createColumnDefinition('is_updatable', 'string'),
        this.createColumnDefinition('is_system_defined', 'string'),
        this.createColumnDefinition('is_partitioning_column', 'string'),
        this.createColumnDefinition('clustering_ordinal_position', 'int64'),
        this.createColumnDefinition('collation_name', 'string'),
      ],
    ],
    [
      'column_field_paths',
      [
        this.createColumnDefinition('table_catalog', 'string'),
        this.createColumnDefinition('table_schema', 'string'),
        this.createColumnDefinition('table_name', 'string'),
        this.createColumnDefinition('column_name', 'string'),
        this.createColumnDefinition('field_path', 'string'),
        this.createColumnDefinition('data_type', 'string'),
        this.createColumnDefinition('description', 'string'),
        this.createColumnDefinition('collation_name', 'string'),
      ],
    ],
    [
      'partitions',
      [
        this.createColumnDefinition('table_catalog', 'string'),
        this.createColumnDefinition('table_schema', 'string'),
        this.createColumnDefinition('table_name', 'string'),
        this.createColumnDefinition('partition_id', 'string'),
        this.createColumnDefinition('total_rows', 'integer'),
        this.createColumnDefinition('total_logical_bytes', 'integer'),
        this.createColumnDefinition('total_billable_bytes', 'integer'),
        this.createColumnDefinition('last_modified_time', 'timestamp'),
        this.createColumnDefinition('storage_tier', 'string'),
      ],
    ],
    [
      'table_storage',
      [
        this.createColumnDefinition('project_id', 'string'),
        this.createColumnDefinition('project_name', 'int64'),
        this.createColumnDefinition('table_schema', 'string'),
        this.createColumnDefinition('table_name', 'string'),
        this.createColumnDefinition('creation_time', 'timestamp'),
        this.createColumnDefinition('total_rows', 'int64'),
        this.createColumnDefinition('total_partitions', 'int64'),
        this.createColumnDefinition('total_logical_bytes', 'int64'),
        this.createColumnDefinition('active_logical_bytes', 'int64'),
        this.createColumnDefinition('long_term_logical_bytes', 'int64'),
        this.createColumnDefinition('total_physical_bytes', 'int64'),
        this.createColumnDefinition('active_physical_bytes', 'int64'),
        this.createColumnDefinition('long_term_physical_bytes', 'int64'),
        this.createColumnDefinition('time_travel_physical_bytes', 'int64'),
      ],
    ],
  ]);

  static {
    ['jobs_by_user', 'jobs_by_project', 'jobs_by_folder', 'jobs_by_organization'].forEach(tableName => {
      InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.set(tableName, [
        this.createColumnDefinition('creation_time', 'timestamp'),
        this.createColumnDefinition('project_id', 'timestamp'),
        this.createColumnDefinition('project_number', 'integer'),
        this.createColumnDefinition('folder_numbers', 'integer'),
        this.createColumnDefinition('user_email', 'string'),
        this.createColumnDefinition('job_id', 'string'),
        this.createColumnDefinition('job_type', 'string'),
        this.createColumnDefinition('statement_type', 'string'),
        this.createColumnDefinition('priority', 'string'),
        this.createColumnDefinition('start_time', 'timestamp'),
        this.createColumnDefinition('end_time', 'timestamp'),
        this.createColumnDefinition('query', 'string'),
        this.createColumnDefinition('state', 'string'),
        this.createColumnDefinition('reservation_id', 'string'),
        this.createColumnDefinition('total_bytes_processed', 'integer'),
        this.createColumnDefinition('total_slot_ms', 'integer'),
        this.createColumnDefinition('error_result', 'record', [
          this.createColumnDefinition('reason', 'string'),
          this.createColumnDefinition('location', 'string'),
          this.createColumnDefinition('debug_info', 'string'),
          this.createColumnDefinition('message', 'string'),
        ]),
        this.createColumnDefinition('cache_hit', 'boolean'),
        this.createColumnDefinition('destination_table', 'record', [
          this.createColumnDefinition('project_id', 'string'),
          this.createColumnDefinition('dataset_id', 'string'),
          this.createColumnDefinition('table_id', 'string'),
        ]),
        this.createColumnDefinition(
          'referenced_tables',
          'record',
          [
            this.createColumnDefinition('project_id', 'string'),
            this.createColumnDefinition('dataset_id', 'string'),
            this.createColumnDefinition('table_id', 'string'),
          ],
          'repeated',
        ),
        this.createColumnDefinition(
          'labels',
          'record',
          [
            { name: 'key', type: 'string' },
            { name: 'value', type: 'string' },
          ],
          'repeated',
        ),
        this.createColumnDefinition('timeline', 'record', [
          this.createColumnDefinition('elapsed_ms', 'string'),
          this.createColumnDefinition('total_slot_ms', 'string'),
          this.createColumnDefinition('pending_units', 'string'),
          this.createColumnDefinition('completed_units', 'string'),
          this.createColumnDefinition('active_units', 'string'),
        ]),
        this.createColumnDefinition('job_stages', 'record', [
          this.createColumnDefinition('name', 'string'),
          this.createColumnDefinition('id', 'string'),
          this.createColumnDefinition('start_ms', 'string'),
          this.createColumnDefinition('end_ms', 'string'),
          this.createColumnDefinition('input_stages', 'string'),
          this.createColumnDefinition('wait_ratio_avg', 'int64'),
          this.createColumnDefinition('wait_ms_avg', 'string'),
          this.createColumnDefinition('wait_ratio_max', 'int64'),
          this.createColumnDefinition('wait_ms_max', 'string'),
          this.createColumnDefinition('read_ratio_avg', 'int64'),
          this.createColumnDefinition('read_ms_max', 'string'),
          this.createColumnDefinition('compute_ratio_avg', 'int64'),
          this.createColumnDefinition('compute_ms_avg', 'string'),
          this.createColumnDefinition('compute_ratio_max', 'int64'),
          this.createColumnDefinition('compute_ms_max', 'string'),
          this.createColumnDefinition('write_ratio_avg', 'int64'),
          this.createColumnDefinition('write_ms_avg', 'string'),
          this.createColumnDefinition('write_ratio_max', 'int64'),
          this.createColumnDefinition('write_ms_max', 'string'),
          this.createColumnDefinition('shuffle_output_bytes', 'string'),
          this.createColumnDefinition('shuffle_output_bytes', 'string'),
          this.createColumnDefinition('records_read', 'string'),
          this.createColumnDefinition('records_written', 'string'),
          this.createColumnDefinition('parallel_inputs', 'string'),
          this.createColumnDefinition('completed_parallel_inputs', 'string'),
          this.createColumnDefinition('status', 'string'),
          this.createColumnDefinition('steps', 'string'),
          this.createColumnDefinition('slot_ms', 'string'),
        ]),
        this.createColumnDefinition('total_bytes_billed', 'integer'),
        this.createColumnDefinition('parent_job_id', 'string'),
        this.createColumnDefinition('transaction_id', 'string'),
        this.createColumnDefinition('session_info', 'record'),
        this.createColumnDefinition('dml_statistics', 'record', [
          this.createColumnDefinition('inserted_row_count', 'int64'),
          this.createColumnDefinition('deleted_row_count', 'int64'),
          this.createColumnDefinition('updated_row_count', 'int64'),
        ]),
        this.createColumnDefinition('bi_engine_statistics', 'record'),
        this.createColumnDefinition('total_modified_partitions', 'integer'),
      ]);
    });
  }

  fillInformationSchema(tableDefinition: TableDefinition, parentCatalog: SimpleCatalogProto): void {
    let informationSchemaCatalog = parentCatalog.catalog?.find(c => c.name === InformationSchemaConfigurator.INFORMATION_SCHEMA);
    if (tableDefinition.catalogCount === undefined) {
      if (!informationSchemaCatalog) {
        informationSchemaCatalog = {
          name: InformationSchemaConfigurator.INFORMATION_SCHEMA,
        };
        parentCatalog.catalog = parentCatalog.catalog ?? [];
        parentCatalog.catalog.push(informationSchemaCatalog);
      }
    } else {
      informationSchemaCatalog = parentCatalog;
    }
    this.addInformationSchemaTableColumns(tableDefinition, informationSchemaCatalog);
  }

  addInformationSchemaTableColumns(tableDefinition: TableDefinition, informationSchemaCatalog: SimpleCatalogProto): void {
    const informationSchemaTable = InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.get(tableDefinition.getTableName());
    if (informationSchemaTable && !informationSchemaCatalog.table?.find(t => t.name === tableDefinition.getTableNameInZetaSql())) {
      const table = {
        name: tableDefinition.getTableNameInZetaSql(),
      };
      informationSchemaCatalog.table = informationSchemaCatalog.table ?? [];
      informationSchemaCatalog.table.push(table);
      informationSchemaTable.forEach(columnDefinition =>
        ZetaSqlWrapper.addColumn(table, ZetaSqlWrapper.createSimpleColumn(columnDefinition.name, this.zetaSqlApi.createType(columnDefinition))),
      );
    }
  }
}
