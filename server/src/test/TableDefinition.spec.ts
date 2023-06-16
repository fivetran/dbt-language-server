/* eslint-disable sonarjs/no-duplicate-string */
import { assertThat } from 'hamjest';
import { TableDefinition } from '../TableDefinition';

describe('TableDefinition', () => {
  it('getProjectName should return project name', () => {
    getProjectNameShouldReturnProjectName(['project', 'data_set', 'table'], 'project');
    getProjectNameShouldReturnProjectName(['PROJECT', 'data_set', 'table'], 'PROJECT');
    getProjectNameShouldReturnProjectName(['project.data_set.table'], 'project');
    getProjectNameShouldReturnProjectName(['PROJECT.data_set.table'], 'PROJECT');
    getProjectNameShouldReturnProjectName(['project.data_set', 'table'], 'project');
    getProjectNameShouldReturnProjectName(['PROJECT.data_set', 'table'], 'PROJECT');
    getProjectNameShouldReturnProjectName(['data_set', 'table'], undefined);

    getProjectNameShouldReturnProjectName(['project', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'project');
    getProjectNameShouldReturnProjectName(['PROJECT', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'PROJECT');
    getProjectNameShouldReturnProjectName(['data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], undefined);
    getProjectNameShouldReturnProjectName(['INFORMATION_SCHEMA', 'COLUMNS'], undefined);
  });

  it('getProjectCatalogName should return project catalog name', () => {
    getProjectCatalogNameShouldReturnProjectCatalogName(['project', 'data_set', 'table'], 'project');
    getProjectCatalogNameShouldReturnProjectCatalogName(['PROJECT', 'data_set', 'table'], 'PROJECT');
    getProjectCatalogNameShouldReturnProjectCatalogName(['project.data_set.table'], undefined);
    getProjectCatalogNameShouldReturnProjectCatalogName(['project.data_set', 'table'], undefined);
    getProjectCatalogNameShouldReturnProjectCatalogName(['data_set', 'table'], undefined);

    getProjectCatalogNameShouldReturnProjectCatalogName(['project', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'project');
    getProjectCatalogNameShouldReturnProjectCatalogName(['PROJECT', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'PROJECT');
    getProjectCatalogNameShouldReturnProjectCatalogName(['data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], undefined);
    getProjectCatalogNameShouldReturnProjectCatalogName(['INFORMATION_SCHEMA', 'COLUMNS'], undefined);
  });

  it('getDataSetName should return data set name', () => {
    getDataSetNameShouldReturnDataSetName(['project', 'data_set', 'table'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['project', 'DATA_SET', 'table'], 'DATA_SET');
    getDataSetNameShouldReturnDataSetName(['project.data_set.table'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['project.DATA_SET.table'], 'DATA_SET');
    getDataSetNameShouldReturnDataSetName(['project.data_set', 'table'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['project.DATA_SET', 'table'], 'DATA_SET');
    getDataSetNameShouldReturnDataSetName(['data_set', 'table'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['DATA_SET', 'table'], 'DATA_SET');

    getDataSetNameShouldReturnDataSetName(['project', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['INFORMATION_SCHEMA', 'COLUMNS'], undefined);
  });

  it('getDataSetCatalogName should return data set catalog name', () => {
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['project', 'data_set', 'table'], 'data_set');
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['project', 'DATA_SET', 'table'], 'DATA_SET');
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['project.data_set.table'], undefined);
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['project.data_set', 'table'], 'project.data_set');
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['project.DATA_SET', 'table'], 'project.DATA_SET');
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['data_set', 'table'], 'data_set');
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['DATA_SET', 'table'], 'DATA_SET');

    getDataSetCatalogNameShouldReturnDataSetCatalogName(['project', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'data_set');
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'data_set');
    getDataSetCatalogNameShouldReturnDataSetCatalogName(['INFORMATION_SCHEMA', 'COLUMNS'], undefined);
  });

  it('getTableName should return table name', () => {
    geTableNameShouldReturnTableName(['project', 'data_set', 'table'], 'table');
    geTableNameShouldReturnTableName(['project', 'data_set', 'TABLE'], 'TABLE');
    geTableNameShouldReturnTableName(['project.data_set.table'], 'table');
    geTableNameShouldReturnTableName(['project.data_set.TABLE'], 'TABLE');
    geTableNameShouldReturnTableName(['project.data_set', 'table'], 'table');
    geTableNameShouldReturnTableName(['project.data_set', 'TABLE'], 'TABLE');
    geTableNameShouldReturnTableName(['data_set', 'table'], 'table');
    geTableNameShouldReturnTableName(['data_set', 'TABLE'], 'TABLE');

    geTableNameShouldReturnTableName(['project', 'data_set', 'INFORMATION_SCHEMA', 'columns'], 'columns');
    geTableNameShouldReturnTableName(['data_set', 'INFORMATION_SCHEMA', 'columns'], 'columns');
  });

  it('getTableNameInZetaSql should return table name in ZetaSQL', () => {
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['project', 'data_set', 'table'], 'table');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['project', 'data_set', 'TABLE'], 'TABLE');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['project.data_set.table'], 'project.data_set.table');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['project.data_set.TABLE'], 'project.data_set.TABLE');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['project.data_set', 'table'], 'table');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['project.data_set', 'TABLE'], 'TABLE');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['data_set', 'table'], 'table');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['data_set', 'TABLE'], 'TABLE');

    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['project', 'data_set', 'INFORMATION_SCHEMA', 'columns'], 'columns');
    getTableNameInZetaSqlShouldReturnTableNameInZetaSql(['data_set', 'INFORMATION_SCHEMA', 'columns'], 'columns');
  });
});

function getProjectCatalogNameShouldReturnProjectCatalogName(namePart: string[], expectedName: string | undefined): void {
  assertThat(new TableDefinition(namePart).getProjectCatalogName(), expectedName);
}

function getProjectNameShouldReturnProjectName(namePart: string[], expectedName: string | undefined): void {
  assertThat(new TableDefinition(namePart).getProjectName(), expectedName);
}

function getDataSetNameShouldReturnDataSetName(namePart: string[], expectedName: string | undefined): void {
  assertThat(new TableDefinition(namePart).getDataSetName(), expectedName);
}

function getDataSetCatalogNameShouldReturnDataSetCatalogName(namePart: string[], expectedName: string | undefined): void {
  assertThat(new TableDefinition(namePart).getDatasetCatalogName(), expectedName);
}

function geTableNameShouldReturnTableName(namePart: string[], expectedName: string): void {
  assertThat(new TableDefinition(namePart).getTableName(), expectedName);
}

function getTableNameInZetaSqlShouldReturnTableNameInZetaSql(namePart: string[], expectedName: string): void {
  assertThat(new TableDefinition(namePart).getTableNameInZetaSql(), expectedName);
}
