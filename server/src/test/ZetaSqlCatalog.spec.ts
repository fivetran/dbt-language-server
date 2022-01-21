import * as assert from 'assert';
import { TableDefinition } from '../TableDefinition';
import { ZetaSqlCatalog } from '../ZetaSqlCatalog';

describe('ZetaSqlCatalogTest', () => {
  beforeEach(async () => {
    (ZetaSqlCatalog as any).instance = null;
  });

  const PROJECT_ID = 'project_id';
  const DATA_SET = 'data_set';
  const TABLE = 'table';
  const COLUMN_NAME = 'column_name';
  const COLUMN_TYPE = 'string';
  const ONE_TABLE = {
    fields: [{ name: COLUMN_NAME, type: COLUMN_TYPE }],
  };

  async function shouldRegisterOneTable(
    tableDefinitions: TableDefinition[],
    table: string,
    expectedColumns: string[],
    expectedDataSet?: string,
    expectedProjectId?: string,
  ): Promise<void> {
    // arrange
    const zetaSqlCatalog = ZetaSqlCatalog.getInstance();

    zetaSqlCatalog.catalog.register = async (): Promise<void> => {
      // do nothing
    };
    zetaSqlCatalog.registerAllLanguageFeatures = async (): Promise<void> => {
      // do nothing
    };

    // act
    try {
      await zetaSqlCatalog.register(tableDefinitions);
    } catch (e) {
      console.log(e);
    }

    // assert
    if (expectedProjectId) {
      const projects = zetaSqlCatalog.catalog.catalogs;
      assert.strictEqual(projects.size, 1);
      assert.strictEqual(projects.get(expectedProjectId)?.name, expectedProjectId);
    }

    const datasets = expectedProjectId ? zetaSqlCatalog.catalog.catalogs.get(expectedProjectId)?.catalogs : zetaSqlCatalog.catalog.catalogs;
    if (expectedDataSet) {
      assert.strictEqual(datasets?.size, 1);
      assert.strictEqual(datasets.get(expectedDataSet)?.name, expectedDataSet);
    }

    const tables = expectedDataSet ? datasets?.get(DATA_SET)?.tables : zetaSqlCatalog.catalog.tables;
    assert.strictEqual(tables?.size, 1);
    assert.strictEqual(tables.get(table)?.name, table);

    const columns = tables.get(table)?.columns;
    assert.strictEqual(columns?.length, expectedColumns.length);
    assert.deepStrictEqual(columns.map(c => c.getName()).sort(), expectedColumns.sort());
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
