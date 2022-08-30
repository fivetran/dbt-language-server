import { assertThat } from 'hamjest';
import { TableDefinition } from '../TableDefinition';

describe('TableDefinition', () => {
  it('getProjectName should return project name', () => {
    getProjectNameShouldReturnProjectName(['project', 'data_set', 'table'], 'project');
    getProjectNameShouldReturnProjectName(['data_set', 'table'], undefined);

    getProjectNameShouldReturnProjectName(['project', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'project');
    getProjectNameShouldReturnProjectName(['data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], undefined);
    getProjectNameShouldReturnProjectName(['INFORMATION_SCHEMA', 'COLUMNS'], undefined);
  });

  it('getDataSetName should return data set name', () => {
    getDataSetNameShouldReturnDataSetName(['project', 'data_set', 'table'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['data_set', 'table'], 'data_set');

    getDataSetNameShouldReturnDataSetName(['project', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'data_set');
    getDataSetNameShouldReturnDataSetName(['INFORMATION_SCHEMA', 'COLUMNS'], undefined);
  });

  it('getTableName should return table name', () => {
    geTableNameShouldReturnTableName(['project', 'data_set', 'table'], 'table');
    geTableNameShouldReturnTableName(['data_set', 'table'], 'table');

    geTableNameShouldReturnTableName(['project', 'data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'columns');
    geTableNameShouldReturnTableName(['data_set', 'INFORMATION_SCHEMA', 'COLUMNS'], 'columns');
  });
});

function getProjectNameShouldReturnProjectName(namePart: string[], expectedName: string | undefined): void {
  assertThat(new TableDefinition(namePart).getProjectName(), expectedName);
}

function getDataSetNameShouldReturnDataSetName(namePart: string[], expectedName: string | undefined): void {
  assertThat(new TableDefinition(namePart).getDataSetName(), expectedName);
}

function geTableNameShouldReturnTableName(namePart: string[], expectedName: string): void {
  assertThat(new TableDefinition(namePart).getTableName(), expectedName);
}
