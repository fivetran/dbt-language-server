import { SimpleCatalog, SimpleColumn } from '@fivetrandevelopers/zetasql';
import * as assert from 'assert';
import { assertThat, greaterThan } from 'hamjest';
import { InformationSchemaConfigurator } from '../InformationSchemaConfigurator';
import { TableDefinition } from '../TableDefinition';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';

describe('ZetaSqlWrapper', () => {
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
    // arrange, act
    const rootCatalog = await registerCatalog(tableDefinitions);

    // assert
    assertProject(rootCatalog, expectedProjectId);

    const datasets = expectedProjectId ? rootCatalog.catalogs.get(expectedProjectId)?.catalogs : rootCatalog.catalogs;
    assertDataSet(datasets, expectedDataSet);

    const tables = expectedDataSet ? datasets?.get(DATA_SET)?.tables : rootCatalog.tables;
    assert.ok(tables);
    assertThat(tables.size, 1);
    assertThat(tables.get(table)?.name, table);

    const columns = tables.get(table)?.columns;
    assert.ok(columns);
    assertThat(columns.length, expectedColumns.length);
    assertThat(columns.map((c: SimpleColumn) => c.getName()).sort(), expectedColumns.sort());
  }

  function assertProject(rootCatalog: SimpleCatalog, expectedProjectId?: string): void {
    if (expectedProjectId) {
      const projects = rootCatalog.catalogs;
      assertThat(projects.size, 1);
      assertThat(projects.get(expectedProjectId)?.name, expectedProjectId);
    }
  }

  function assertDataSet(datasets?: Map<string, SimpleCatalog>, expectedDataSet?: string): void {
    if (expectedDataSet) {
      assert.ok(datasets);
      assertThat(datasets.size, 1);
      assertThat(datasets.get(expectedDataSet)?.name, expectedDataSet);
    }
  }

  async function registerCatalog(tableDefinitions: TableDefinition[]): Promise<SimpleCatalog> {
    const zetaSqlWrapper = new ZetaSqlWrapper();

    getCatalog(zetaSqlWrapper).register = async (): Promise<void> => {
      // do nothing
    };
    zetaSqlWrapper['registerAllLanguageFeatures'] = async (): Promise<void> => {
      // do nothing
    };

    try {
      await zetaSqlWrapper.registerCatalog(tableDefinitions);
    } catch (e) {
      console.log(e);
    }

    return getCatalog(zetaSqlWrapper);
  }

  async function shouldRegisterInformationSchema(
    tableDefinitions: TableDefinition[],
    expectedDataSet: string | undefined,
    expectedTableName: string,
    expectedProjectId?: string,
  ): Promise<void> {
    // arrange, act
    const rootCatalog = await registerCatalog(tableDefinitions);

    // assert
    assertProject(rootCatalog, expectedProjectId);

    const datasets = expectedProjectId ? rootCatalog.catalogs.get(expectedProjectId)?.catalogs : rootCatalog.catalogs;
    assertDataSet(datasets, expectedDataSet);
    let parent = rootCatalog;
    if (expectedDataSet) {
      const dataSetCatalog = datasets?.get(expectedDataSet);
      assert.ok(dataSetCatalog);
      assertThat(dataSetCatalog.catalogs.size, 1);
      parent = dataSetCatalog;
    }

    const informationSchemaCatalog = parent.catalogs.get(InformationSchemaConfigurator.INFORMATION_SCHEMA);
    assert.ok(informationSchemaCatalog);
    assertThat(informationSchemaCatalog.tables.size, 1);

    const table = informationSchemaCatalog.tables.get(expectedTableName);
    assert.ok(table);
    assertThat(table.columns.length, greaterThan(0));
    assertThat(table.columns.length, InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.get(expectedTableName)?.length);
  }

  it('register should register project data set and table', async () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    await shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET, PROJECT_ID);
  });

  it('register should register data set and table', async () => {
    const tableDefinition = new TableDefinition([DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    await shouldRegisterOneTable([tableDefinition], TABLE, [COLUMN_NAME], DATA_SET);
  });

  it('register should register only table', async () => {
    const tableName = `${PROJECT_ID}.${DATA_SET}.${TABLE}`;
    const tableDefinition = new TableDefinition([tableName]);
    tableDefinition.schema = ONE_TABLE;
    await shouldRegisterOneTable([tableDefinition], tableName, [COLUMN_NAME]);
  });

  it('register should register table with time partitioning', async () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.schema = ONE_TABLE;
    tableDefinition.timePartitioning = true;
    await shouldRegisterOneTable(
      [tableDefinition],
      TABLE,
      [COLUMN_NAME, ZetaSqlWrapper.PARTITION_TIME, ZetaSqlWrapper.PARTITION_DATE],
      DATA_SET,
      PROJECT_ID,
    );
  });

  it('register should register information schema', async () => {
    const tableName = 'columns';
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, InformationSchemaConfigurator.INFORMATION_SCHEMA, tableName]);
    await shouldRegisterInformationSchema([tableDefinition], DATA_SET, tableName, PROJECT_ID);
  });

  it('register should register information schema when only schema specified', async () => {
    for (const tableName of InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.keys()) {
      const tableDefinition = new TableDefinition([DATA_SET, InformationSchemaConfigurator.INFORMATION_SCHEMA, tableName]);
      await shouldRegisterInformationSchema([tableDefinition], DATA_SET, tableName);
    }
  });

  it('register should register information schema without project and data set name', async () => {
    for (const tableName of InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.keys()) {
      const tableDefinition = new TableDefinition([InformationSchemaConfigurator.INFORMATION_SCHEMA, tableName]);
      await shouldRegisterInformationSchema([tableDefinition], undefined, tableName);
    }
  });
});
