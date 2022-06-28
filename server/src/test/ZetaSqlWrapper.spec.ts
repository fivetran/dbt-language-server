import { TypeKind } from '@fivetrandevelopers/zetasql';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import * as assert from 'assert';
import { assertThat, greaterThan, hasExactlyOneItem, hasProperty, hasSize } from 'hamjest';
import { mock } from 'ts-mockito';
import { BigQueryClient, Udf } from '../bigquery/BigQueryClient';
import { DbtRepository } from '../DbtRepository';
import { InformationSchemaConfigurator } from '../InformationSchemaConfigurator';
import { TableDefinition } from '../TableDefinition';
import { arraysAreEqual } from '../utils/Utils';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';

describe('ZetaSqlWrapper', () => {
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

  function shouldRegisterTable(
    tableDefinition: TableDefinition,
    table: string,
    expectedColumns: string[],
    expectedDataSet?: string,
    expectedProjectId?: string,
  ): void {
    // arrange, act
    const zetaSqlWrapper = new ZetaSqlWrapper(mock(DbtRepository), mock(BigQueryClient));
    const rootCatalog = registerTable(zetaSqlWrapper, tableDefinition);

    // assert
    assertProject(rootCatalog, expectedProjectId);

    const datasets = expectedProjectId ? rootCatalog.catalog?.find(c => c.name === expectedProjectId)?.catalog : rootCatalog.catalog;
    assertDataSet(datasets, expectedDataSet);

    const tables = expectedDataSet ? datasets?.find(c => c.name === DATA_SET)?.table : rootCatalog.table;
    assert.ok(tables);
    assertThat(tables, hasExactlyOneItem(hasProperty('name', table)));

    const columns = tables.find(t => t.name === table)?.column;
    assert.ok(columns);
    assertThat(columns.length, expectedColumns.length);
    assertThat(columns.map(c => c.name).sort(), expectedColumns.sort());
  }

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

  function registerTable(zetaSqlWrapper: ZetaSqlWrapper, tableDefinitions: TableDefinition): SimpleCatalogProto {
    zetaSqlWrapper.registerTable(tableDefinitions);
    return zetaSqlWrapper['catalog'];
  }

  function registerUdf(zetaSqlWrapper: ZetaSqlWrapper, udf: Udf): SimpleCatalogProto {
    zetaSqlWrapper.registerUdf(udf);
    return zetaSqlWrapper['catalog'];
  }
  function shouldRegisterInformationSchema(
    tableDefinition: TableDefinition,
    expectedDataSet: string | undefined,
    expectedTableName: string,
    expectedProjectId?: string,
  ): void {
    // arrange, act
    const zetaSqlWrapper = new ZetaSqlWrapper(mock(DbtRepository), mock(BigQueryClient));
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

    const informationSchemaCatalog = parent.catalog?.find(c => c.name === InformationSchemaConfigurator.INFORMATION_SCHEMA);
    assert.ok(informationSchemaCatalog);
    assertThat(informationSchemaCatalog.table, hasSize(1));

    const table = informationSchemaCatalog.table?.find(t => t.name === expectedTableName);
    assert.ok(table);
    assertThat(table.column?.length, greaterThan(0));
    assertThat(table.column, hasSize(InformationSchemaConfigurator.INFORMATION_SCHEMA_COLUMNS.get(expectedTableName)?.length));
  }

  it('registerTable should register project data set and table', () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN_NAME], DATA_SET, PROJECT_ID);
  });

  it('registerTable should register data set and table', () => {
    const tableDefinition = new TableDefinition([DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN_NAME], DATA_SET);
  });

  it('registerTable should register only table', () => {
    const tableName = `${PROJECT_ID}.${DATA_SET}.${TABLE}`;
    const tableDefinition = new TableDefinition([tableName]);
    tableDefinition.columns = [ONE_COLUMN];
    shouldRegisterTable(tableDefinition, tableName, [ONE_COLUMN_NAME]);
  });

  it('registerTable should register table with time partitioning', () => {
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    tableDefinition.timePartitioning = true;
    shouldRegisterTable(
      tableDefinition,
      TABLE,
      [ONE_COLUMN_NAME, ZetaSqlWrapper.PARTITION_TIME, ZetaSqlWrapper.PARTITION_DATE],
      DATA_SET,
      PROJECT_ID,
    );
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

  it('register should register added column', () => {
    // arrange
    const zetaSqlWrapper = new ZetaSqlWrapper(mock(DbtRepository), mock(BigQueryClient));
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN];
    registerTable(zetaSqlWrapper, tableDefinition);

    // act, assert
    tableDefinition.columns.push(TWO_COLUMN);
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN_NAME, TWO_COLUMN_NAME], DATA_SET, PROJECT_ID);
  });

  it('register should unregister deleted column', () => {
    // arrange
    const zetaSqlWrapper = new ZetaSqlWrapper(mock(DbtRepository), mock(BigQueryClient));
    const tableDefinition = new TableDefinition([PROJECT_ID, DATA_SET, TABLE]);
    tableDefinition.columns = [ONE_COLUMN, TWO_COLUMN];
    registerTable(zetaSqlWrapper, tableDefinition);

    // act, assert
    tableDefinition.columns.pop();
    shouldRegisterTable(tableDefinition, TABLE, [ONE_COLUMN_NAME], DATA_SET, PROJECT_ID);
  });

  it('registerUdf should register UDF', () => {
    const zetaSqlWrapper = new ZetaSqlWrapper(mock(DbtRepository), mock(BigQueryClient));
    const udf: Udf = {
      nameParts: ['udfs', 'func'],
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

    const rootCatalog = registerUdf(zetaSqlWrapper, udf);

    const udfsCatalog = rootCatalog.catalog?.find(c => c.name === 'udfs');
    assert.ok(udfsCatalog);
    const func = udfsCatalog.customFunction?.find(c => c.namePath && arraysAreEqual(c.namePath, ['udfs', 'func']));
    assert.ok(func);
  });
});
