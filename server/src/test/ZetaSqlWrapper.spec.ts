import { TypeKind } from '@fivetrandevelopers/zetasql';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { assertThat, greaterThan, hasExactlyOneItem, hasProperty, hasSize } from 'hamjest';
import * as assert from 'node:assert';
import { mock } from 'ts-mockito';
import { BigQueryClient, Udf } from '../bigquery/BigQueryClient';
import { InformationSchemaConfigurator } from '../InformationSchemaConfigurator';
import { SqlHeaderAnalyzer } from '../SqlHeaderAnalyzer';
import { TableDefinition } from '../TableDefinition';
import { arraysAreEqual } from '../utils/Utils';
import { ZetaSqlParser } from '../ZetaSqlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';

describe('ZetaSqlWrapper table/udf registration', () => {
  const PROJECT_ID = 'project_id';
  const DATA_SET = 'data_set';
  const TABLE = 'table';

  const ONE_COLUMN_NAME = 'one_column_name';
  const TWO_COLUMN_NAME = 'two_column_name';

  const ONE_COLUMN = {
    name: ONE_COLUMN_NAME,
    type: { typeKind: TypeKind.TYPE_STRING },
  };
  const TWO_COLUMN = {
    name: TWO_COLUMN_NAME,
    type: { typeKind: TypeKind.TYPE_STRING },
  };

  const PARTITION_TIME_COLUMN = {
    name: ZetaSqlWrapper.PARTITION_TIME,
    type: { typeKind: TypeKind.TYPE_TIMESTAMP },
  };

  const PARTITION_DATE_COLUMN = {
    name: ZetaSqlWrapper.PARTITION_DATE,
    type: { typeKind: TypeKind.TYPE_DATE },
  };

  let zetaSqlWrapper: ZetaSqlWrapper;

  before(() => {
    zetaSqlWrapper = new ZetaSqlWrapper(mock(BigQueryClient), mock(ZetaSqlParser), mock(SqlHeaderAnalyzer));
  });

  function shouldRegisterTable(
    tableDefinition: TableDefinition,
    table: string,
    expectedColumns: SimpleColumnProto[],
    expectedDataSet?: string,
    expectedProjectId?: string,
  ): void {
    // arrange, act
    const rootCatalog = registerTable(zetaSqlWrapper, tableDefinition);

    // assert
    assertProject(rootCatalog, expectedProjectId);

    const datasets = expectedProjectId ? rootCatalog.catalog?.find(c => c.name === expectedProjectId)?.catalog : rootCatalog.catalog;
    assertDataSet(datasets, expectedDataSet);

    const tables = expectedDataSet ? datasets?.find(c => c.name === expectedDataSet)?.table : rootCatalog.table;
    assert.ok(tables);
    assertThat(tables, hasExactlyOneItem(hasProperty('name', table)));

    const columns = tables.find(t => t.name === table)?.column;
    assert.ok(columns);
    assertThat(columns.length, expectedColumns.length);

    assertThat(columns, expectedColumns);
  }

  function registerTable(zetaWrapper: ZetaSqlWrapper, tableDefinitions: TableDefinition): SimpleCatalogProto {
    zetaWrapper.registerTable(tableDefinitions);
    return zetaWrapper['catalog'];
  }

  function registerUdf(zetaWrapper: ZetaSqlWrapper, udf: Udf): SimpleCatalogProto {
    zetaWrapper['registerUdf'](udf);
    return zetaWrapper['catalog'];
  }

  function shouldRegisterInformationSchema(
    tableDefinition: TableDefinition,
    expectedDataSet: string | undefined,
    expectedTableName: string,
    expectedProjectId?: string,
  ): void {
    // arrange, act
    zetaSqlWrapper = new ZetaSqlWrapper(mock(BigQueryClient), mock(ZetaSqlParser), mock(SqlHeaderAnalyzer));
    const rootCatalog = registerTable(zetaSqlWrapper, tableDefinition);

    // assert
    assertProject(rootCatalog, expectedProjectId);

    const datasets = expectedProjectId ? rootCatalog.catalog?.find(c => c.name === expectedProjectId)?.catalog : rootCatalog.catalog;
    assertDataSet(datasets, expectedDataSet);
    let parent = rootCatalog;
    if (expectedDataSet) {
      const dataSetCatalog = datasets?.find(c => c.name === expectedDataSet);
      assert.ok(dataSetCatalog);
      assertThat(dataSetCatalog.catalog, hasSize(1));
      parent = dataSetCatalog;
    }

    let informationSchemaCatalog;
    if (tableDefinition.catalogCount === undefined) {
      informationSchemaCatalog = parent.catalog?.find(c => c.name === InformationSchemaConfigurator.INFORMATION_SCHEMA);
      assert.ok(informationSchemaCatalog);
    } else {
      informationSchemaCatalog = parent;
    }

    assertThat(informationSchemaCatalog.table, hasSize(1));

    const table = informationSchemaCatalog.table?.find(t => t.name === expectedTableName);
    assert.ok(table);
    assertThat(table.column?.length, greaterThan(0));
    assertThat(table.column, hasSize(InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.get(tableDefinition.getTableName())?.length));
  }

  it('registerTable should register project data set and table', () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN], DATA_SET, PROJECT_ID);
  });

  it('registerTable should register data set and table', () => {
    const tableDefinition = new TableDefinition([DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN], DATA_SET);
  });

  it('registerTable should register only table', () => {
    const tableName = `${PROJECT_ID}.${DATA_SET}.${TABLE}`;
    const tableDefinition = new TableDefinition([tableName]);
    tableDefinition.columns = [ONE_COLUMN];
    shouldRegisterTable(tableDefinition, tableName, [ONE_COLUMN]);
  });

  it('registerTable should register dataset and table', () => {
    const tableDefinition = new TableDefinition([`${PROJECT_ID}.${DATA_SET}`, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN], `${PROJECT_ID}.${DATA_SET}`);
  });

  it('registerTable should register table with time partitioning', () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    tableDefinition.timePartitioning = true;
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN, PARTITION_TIME_COLUMN, PARTITION_DATE_COLUMN], DATA_SET, PROJECT_ID);
  });

  it('registerTable should register information schema', () => {
    const tableName = 'columns';
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, InformationSchemaConfigurator.INFORMATION_SCHEMA, tableName]);
    shouldRegisterInformationSchema(tableDefinition, DATA_SET, tableName, PROJECT_ID);
  });

  it('registerTable should register information schema when only schema specified', () => {
    for (const tableName of InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.keys()) {
      const tableDefinition = new TableDefinition([DATA_SET, InformationSchemaConfigurator.INFORMATION_SCHEMA, tableName]);
      shouldRegisterInformationSchema(tableDefinition, DATA_SET, tableName);
    }
  });

  it('registerTable should register information schema without project and data set name', () => {
    for (const tableName of InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.keys()) {
      const tableDefinition = new TableDefinition([InformationSchemaConfigurator.INFORMATION_SCHEMA, tableName]);
      shouldRegisterInformationSchema(tableDefinition, undefined, tableName);
    }
  });

  it('registerTable should register information schema in quotes', () => {
    const tableName = 'region-us.INFORMATION_SCHEMA.JOBS_BY_USER';
    const tableDefinition = new TableDefinition([tableName]);
    shouldRegisterInformationSchema(tableDefinition, undefined, tableName);
  });

  it('register should register added column', () => {
    // arrange
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    registerTable(zetaSqlWrapper, tableDefinition);

    // act, assert
    tableDefinition.columns.push(TWO_COLUMN);
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN, TWO_COLUMN], DATA_SET, PROJECT_ID);
  });

  it('register should update changed column', () => {
    // arrange
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    const oneColumnWithNewType = {
      name: ONE_COLUMN_NAME,
      type: { typeKind: ONE_COLUMN.type.typeKind + 1 },
    };
    tableDefinition.columns = [ONE_COLUMN];
    registerTable(zetaSqlWrapper, tableDefinition);
    tableDefinition.columns = [oneColumnWithNewType];

    // act, assert
    shouldRegisterTable(tableDefinition, TABLE, [oneColumnWithNewType], DATA_SET, PROJECT_ID);
  });

  it('register should unregister deleted column', () => {
    // arrange
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN, TWO_COLUMN];
    registerTable(zetaSqlWrapper, tableDefinition);

    // act, assert
    tableDefinition.columns.pop();
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN], DATA_SET, PROJECT_ID);
  });

  it('registerUdf should register UDF', () => {
    // arrange
    const namePath = ['udfs', 'func'];
    const udf: Udf = {
      nameParts: namePath,
      arguments: [
        {
          name: 'arg',
          type: {
            typeKind: TypeKind.TYPE_INT64,
          },
        },
      ],
      returnType: {
        typeKind: TypeKind.TYPE_INT64,
      },
    };

    // act
    const rootCatalog = registerUdf(zetaSqlWrapper, udf);

    // assert
    const udfsCatalog = rootCatalog.catalog?.find(c => c.name === 'udfs');
    assert.ok(udfsCatalog);
    const func = udfsCatalog.customFunction?.find(c => c.namePath && arraysAreEqual(c.namePath, namePath));
    assert.ok(func);

    assertThat(func.namePath, namePath);

    assert.ok(func.signature);
    assertThat(func.signature, hasSize(1));

    assert.ok(func.signature[0].argument);
    assertThat(func.signature[0].argument, hasSize(1));

    assertThat(func.signature[0].argument[0].type, { typeKind: TypeKind.TYPE_INT64 });
    assertThat(func.signature[0].returnType?.type, { typeKind: TypeKind.TYPE_INT64 });
  });

  it('createCatalogWithTempUdfs should create new catalog and not change existing', () => {
    // arrange
    const tempUdfs = [{ namePath: ['temp_udf'] }];
    const innerCatalogs = [{ name: 'inner_catalog' }];
    zetaSqlWrapper = new ZetaSqlWrapper(mock(BigQueryClient), mock(ZetaSqlParser), mock(SqlHeaderAnalyzer));
    zetaSqlWrapper['catalog'].catalog = innerCatalogs;

    // act
    const newCatalog = zetaSqlWrapper.createCatalogWithTempUdfs(tempUdfs);

    // assert
    assertThat(newCatalog.customFunction, tempUdfs);
    assertThat(newCatalog.catalog, innerCatalogs);
    assertThat(zetaSqlWrapper['catalog'].customFunction, undefined);
    assertThat(zetaSqlWrapper['catalog'].catalog, innerCatalogs);
  });
});

function assertProject(rootCatalog: SimpleCatalogProto, expectedProjectId?: string): void {
  if (expectedProjectId) {
    const projects = rootCatalog.catalog;
    assertThat(projects, hasExactlyOneItem(hasProperty('name', expectedProjectId)));
  }
}

function assertDataSet(datasets?: SimpleCatalogProto[], expectedDataSet?: string): void {
  if (expectedDataSet) {
    assert.ok(datasets);
    assertThat(datasets, hasExactlyOneItem(hasProperty('name', expectedDataSet)));
  }
}
