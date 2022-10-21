import { TextDocument } from 'vscode';

export const SUPPORTED_LANG_IDS = ['sql', 'jinja-sql', 'sql-bigquery'];
export const PACKAGES_YML = 'packages.yml';
export const DBT_PROJECT_YML = 'dbt_project.yml';
export const DEFAULT_PACKAGES_PATHS = ['dbt_packages', 'dbt_modules'];
export const INTEGRATION_TEST_PROJECT_NAME = 'integration_tests';
export const DBT_ADAPTERS = [
  'dbt-postgres',
  'dbt-redshift',
  'dbt-bigquery',
  'dbt-snowflake',
  'dbt-spark[PyHive]',
  'dbt-clickhouse',
  'dbt-databricks',
  'dbt-firebolt',
  'dbt-impala',
  'dbt-iomete',
  'dbt-layer-bigquery',
  'dbt-materialize',
  'dbt-mindsdb',
  'dbt-oracle',
  'dbt-rockset',
  'dbt-singlestore',
  'dbt-trino',
  'dbt-teradata',
  'dbt-tidb',
  'dbt-sqlserver',
  'dbt-synapse',
  'dbt-exasol',
  'dbt-dremio',
  'git+https://github.com/Tomme/dbt-athena.git',
  'dbt-vertica',
  'dbt-glue',
  'dbt-greenplum',
  'dbt-duckdb',
  'dbt-sqlite',
  'dbt-mysql',
  'dbt-ibmdb2',
];

export function isDocumentSupported(document: TextDocument): boolean {
  return (
    (SUPPORTED_LANG_IDS.includes(document.languageId) || document.fileName.endsWith(PACKAGES_YML) || document.fileName.endsWith(DBT_PROJECT_YML)) &&
    document.uri.scheme === 'file'
  );
}
