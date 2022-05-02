import { SimpleCatalog, SimpleColumn } from '@fivetrandevelopers/zetasql';
import * as assert from 'assert';
import { assertThat } from 'hamjest';
import { TableDefinition } from '../TableDefinition';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';

describe('ZetaSqlWrapperTest', () => {
  const PROJECT_ID = 'project_id';
  const DATA_SET = 'data_set';
  const TABLE = 'table';
  const COLUMN_NAME = 'column_name';
  const COLUMN_TYPE = 'string';
  const ONE_TABLE = {
    fields: [{ name: COLUMN_NAME, type: COLUMN_TYPE }],
  };

  function getCatalog(zetaSqlWrapper: ZetaSqlWrapper): SimpleCatalog {
    return zetaSqlWrapper['catalog'];
  }

  async function shouldRegisterOneTable(
    tableDefinitions: TableDefinition[],
    table: string,
    expectedColumns: string[],
    expectedDataSet?: string,
    expectedProjectId?: string,
  ): Promise<void> {
    // arrange
    const zetaSqlWrapper = new ZetaSqlWrapper();

    getCatalog(zetaSqlWrapper).register = async (): Promise<void> => {
      // do nothing
    };
    zetaSqlWrapper['registerAllLanguageFeatures'] = async (): Promise<void> => {
      // do nothing
    };

    // act
    try {
      await zetaSqlWrapper.registerCatalog(tableDefinitions);
    } catch (e) {
      console.log(e);
    }

    // assert
    const simpleCatalog = getCatalog(zetaSqlWrapper);
    if (expectedProjectId) {
      const projects = simpleCatalog.catalogs;
      assertThat(projects.size, 1);
      assertThat(projects.get(expectedProjectId)?.name, expectedProjectId);
    }

    const datasets = expectedProjectId ? simpleCatalog.catalogs.get(expectedProjectId)?.catalogs : simpleCatalog.catalogs;
    if (expectedDataSet) {
      assert.ok(datasets);
      assertThat(datasets.size, 1);
      assertThat(datasets.get(expectedDataSet)?.name, expectedDataSet);
    }

    const tables = expectedDataSet ? datasets?.get(DATA_SET)?.tables : simpleCatalog.tables;
    assert.ok(tables);
    assertThat(tables.size, 1);
    assertThat(tables.get(table)?.name, table);

    const columns = tables.get(table)?.columns;
    assert.ok(columns);
    assertThat(columns.length, expectedColumns.length);
    assertThat(columns.map((c: SimpleColumn) => c.getName()).sort(), expectedColumns.sort());
  }

  it('register_shouldRegisterProjectDataSetAndTable', async () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    await shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET, PROJECT_ID);
  });

  it('register_shouldRegisterDataSetAndTable', async () => {
    const tableDefinition = new TableDefinition([DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    await shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET);
  });

  it('register_shouldRegisterOnlyTable', async () => {
    const tableName = `${PROJECT_ID}.${DATA_SET}.${TABLE}`;
    const tableDefinition = new TableDefinition([tableName]);
    tableDefinition.schema = ONE_TABLE;
    await shouldRegisterOneTable([tableDefinition], tableName, [COLUMN_NAME]);
  });
});
