import * as assert from 'assert';
import { TableDefinition } from '../TableDefinition';
import { ZetaSQLCatalog } from '../ZetaSQLCatalog';

describe('ZetaSQLCatalogTest', () => {
  let zetaSQLModule: any;

  beforeEach(() => {
    zetaSQLModule = require('../ZetaSQLCatalog');
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
  ) {
    // arrange
    const zetaSQLCatalog: ZetaSQLCatalog = zetaSQLModule.ZetaSQLCatalog.getInstance();

    zetaSQLCatalog.catalog.register = async function () {
      // do nothing
    };
    zetaSQLCatalog.registerAllLanguageFeatures = async function () {
      // do nothing
    };

    // act
    try {
      await zetaSQLCatalog.register(tableDefinitions);
    } catch (e) {
      console.log(e);
    }

    // assert
    if (expectedProjectId) {
      const projects = zetaSQLCatalog.catalog.catalogs;
      assert.strictEqual(projects.size, 1);
      assert.strictEqual(projects.get(expectedProjectId)?.name, expectedProjectId);
    }

    const datasets = expectedProjectId ? zetaSQLCatalog.catalog.catalogs.get(expectedProjectId)?.catalogs : zetaSQLCatalog.catalog.catalogs;
    if (expectedDataSet) {
      assert.strictEqual(datasets?.size, 1);
      assert.strictEqual(datasets?.get(expectedDataSet)?.name, expectedDataSet);
    }

    const tables = expectedDataSet ? datasets?.get(DATA_SET)?.tables : zetaSQLCatalog.catalog.tables;
    assert.strictEqual(tables?.size, 1);
    assert.strictEqual(tables?.get(table)?.name, table);

    const columns = tables?.get(table)?.columns;
    assert.strictEqual(columns?.length, expectedColumns.length);
    assert.strictEqual(columns?.map(c => c.getName()).sort(), expectedColumns.sort());
  }

  it('register_shouldRegisterProjectDataSetAndTable', () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET, PROJECT_ID);
  });

  it('register_shouldRegisterDataSetAndTable', () => {
    const tableDefinition = new TableDefinition([DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET);
  });

  it('register_shouldRegisterOnlyTable', () => {
    const tableName = `${PROJECT_ID}.${DATA_SET}.${TABLE}`;
    const tableDefinition = new TableDefinition([tableName]);
    tableDefinition.schema = ONE_TABLE;
    shouldRegisterOneTable([tableDefinition], tableName, [COLUMN_NAME]);
  });
});
