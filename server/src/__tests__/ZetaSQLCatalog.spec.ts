import { TableDefinition } from '../TableDefinition';
import { ZetaSQLCatalog } from '../ZetaSQLCatalog';

describe('ZetaSQLCatalogTest', () => {
  let zetaSQLModule: any;

  beforeEach(() => {
    jest.resetModules();
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

  async function register_shouldRegisterOneTable(
    tableDefinitions: TableDefinition[],
    table: string,
    expectedColumns: string[],
    expectedDataSet?: string,
    expectedProjectId?: string,
  ) {
    // arrange
    const zetaSQLCatalog: ZetaSQLCatalog = zetaSQLModule.ZetaSQLCatalog.getInstance();

    zetaSQLCatalog.catalog.register = jest.fn().mockReturnValue(0);
    zetaSQLCatalog.registerAllLanguageFeatures = jest.fn().mockReturnValue(0);

    // act
    try {
      await zetaSQLCatalog.register(tableDefinitions);
    } catch (e) {
      console.log(e);
    }

    // assert
    if (expectedProjectId) {
      const projects = zetaSQLCatalog.catalog.catalogs;
      expect(projects.size).toBe(1);
      expect(projects.get(expectedProjectId)?.name).toBe(expectedProjectId);
    }

    const dataSets = expectedProjectId ? zetaSQLCatalog.catalog.catalogs.get(expectedProjectId)?.catalogs : zetaSQLCatalog.catalog.catalogs;
    if (expectedDataSet) {
      expect(dataSets?.size).toBe(1);
      expect(dataSets?.get(expectedDataSet)?.name).toBe(expectedDataSet);
    }

    const tables = expectedDataSet ? dataSets?.get(DATA_SET)?.tables : zetaSQLCatalog.catalog.tables;
    expect(tables?.size).toBe(1);
    expect(tables?.get(table)?.name).toBe(table);

    const columns = tables?.get(table)?.columns;
    expect(columns?.length).toBe(expectedColumns.length);
    expect(columns?.map(c => c.getName()).sort()).toEqual(expectedColumns.sort());
  }

  it('register_shouldRegisterProjectDataSetAndTable', async () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    register_shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET, PROJECT_ID);
  });

  it('register_shouldRegisterDataSetAndTable', async () => {
    const tableDefinition = new TableDefinition([DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    register_shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET);
  });

  it('register_shouldRegisterOnlyTable', async () => {
    const tableName = `${PROJECT_ID}.${DATA_SET}.${TABLE}`;
    const tableDefinition = new TableDefinition([tableName]);
    tableDefinition.schema = ONE_TABLE;
    register_shouldRegisterOneTable([tableDefinition], tableName, [COLUMN_NAME]);
  });
});
