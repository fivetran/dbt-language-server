/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { assertThat, contains, defined, hasProperty, hasSize, not } from 'hamjest';
import { anything, capture, instance, mock, objectContaining, spy, verify, when } from 'ts-mockito';
import { BigQueryClient } from '../bigquery/BigQueryClient';
import { DbtRepository } from '../DbtRepository';
import { SqlHeaderAnalyzer } from '../SqlHeaderAnalyzer';
import { ZetaSqlParser } from '../ZetaSqlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import path = require('node:path');

describe('ZetaSqlWrapper analyzeTable', () => {
  const ROOT_PATH = '/home/project';
  const ORIGINAL_FILE_PATH = 'models/model.sql';
  const FILE_PATH = path.join(ROOT_PATH, ORIGINAL_FILE_PATH);
  const COMPILED_SQL = 'select * from dataset.table t where t.id = dataset.udf(1)';
  const INTERNAL_TABLE_NAME_PATH = ['dataset', 'table'];
  const MAIN_TABLE_NAME_PATH = ['db', 'schema', 'main_table'];
  const UDF_NAME_PATH = ['dataset', 'udf'];

  let zetaSqlWrapper: ZetaSqlWrapper;
  let spiedZetaSqlWrapper: ZetaSqlWrapper;
  let mockBigQueryClient: BigQueryClient;
  let mockZetaSQLClient: ZetaSQLClient;
  let mockSqlHeaderAnalyzer: SqlHeaderAnalyzer;

  before(() => {
    ZetaSQLClient.getInstance = (): ZetaSQLClient => instance(mockZetaSQLClient);

    const mockZetaSqlParser = mock(ZetaSqlParser);
    const mockDbtRepository = mock(DbtRepository);
    mockBigQueryClient = mock(BigQueryClient);
    mockZetaSQLClient = mock(ZetaSQLClient);
    mockSqlHeaderAnalyzer = mock(SqlHeaderAnalyzer);

    when(mockDbtRepository.models).thenReturn([
      {
        uniqueId: 'id',
        name: 'main_table',
        packageName: 'packageName',
        rootPath: ROOT_PATH,
        originalFilePath: ORIGINAL_FILE_PATH,
        database: 'db',
        schema: 'schema',
        dependsOn: {
          nodes: [],
        },
        refs: [[]],
        config: {
          sqlHeader: 'sql_header',
        },
      },
    ]);

    when(mockSqlHeaderAnalyzer.getAllFunctionDeclarations(anything(), anything(), anything())).thenReturn(Promise.resolve([]));

    zetaSqlWrapper = new ZetaSqlWrapper(
      instance(mockDbtRepository),
      instance(mockBigQueryClient),
      instance(mockZetaSqlParser),
      instance(mockSqlHeaderAnalyzer),
    );
    zetaSqlWrapper['languageOptions'] = new LanguageOptions();

    when(mockZetaSqlParser.getAllFunctionCalls(COMPILED_SQL, anything())).thenReturn(Promise.resolve([UDF_NAME_PATH]));
    when(mockZetaSQLClient.extractTableNamesFromStatement(anything())).thenReturn(
      Promise.resolve({ tableName: [{ tableNameSegment: INTERNAL_TABLE_NAME_PATH }] }),
    );

    when(mockBigQueryClient.getTableMetadata('dataset', 'table')).thenReturn(
      Promise.resolve({
        schema: {
          fields: [
            {
              name: 'id',
              type: 'int64',
            },
          ],
        },
        timePartitioning: false,
      }),
    );

    when(mockZetaSqlParser.getAllFunctionCalls(COMPILED_SQL)).thenReturn(Promise.resolve([UDF_NAME_PATH]));
    when(mockBigQueryClient.getUdf(undefined, 'dataset', 'udf')).thenReturn(
      Promise.resolve({
        nameParts: UDF_NAME_PATH,
      }),
    );

    when(mockZetaSQLClient.analyze(anything())).thenReturn(
      Promise.resolve({
        resumeBytePosition: 0,
        result: 'resolvedStatement',
      }),
    );
    spiedZetaSqlWrapper = spy(zetaSqlWrapper);
  });

  it('analyzeTable should register tables and udfs before calling analyze', async () => {
    // act
    await zetaSqlWrapper.analyzeTable(FILE_PATH, COMPILED_SQL);

    // assert
    verify(spiedZetaSqlWrapper.registerTable(objectContaining({ namePath: INTERNAL_TABLE_NAME_PATH }))).calledBefore(
      spiedZetaSqlWrapper.registerTable(objectContaining({ namePath: MAIN_TABLE_NAME_PATH })),
    );

    verify(spiedZetaSqlWrapper.registerTable(anything())).twice();
    verify(spiedZetaSqlWrapper.registerUdf(anything())).once();
    verify(spiedZetaSqlWrapper.fillTableWithAnalyzeResponse(anything(), anything())).once();

    verify(spiedZetaSqlWrapper.registerUdf(anything())).calledBefore(mockZetaSQLClient.analyze(anything()));

    assertThat(zetaSqlWrapper['registeredTables'], hasSize(2));
    assertThat(
      zetaSqlWrapper['registeredTables'],
      contains(hasProperty('namePath', INTERNAL_TABLE_NAME_PATH), hasProperty('namePath', MAIN_TABLE_NAME_PATH)),
    );
    assertThat(zetaSqlWrapper['registeredFunctions'], hasSize(1));
  });

  it('analyzeTable should call bigquery only once if table is already registered', async () => {
    // arrange
    await zetaSqlWrapper.analyzeTable(FILE_PATH, COMPILED_SQL);

    // act
    await zetaSqlWrapper.analyzeTable(FILE_PATH, COMPILED_SQL);

    // assert
    verify(mockBigQueryClient.getTableMetadata(anything(), anything())).once();
  });

  it('analyzeTable should not add temporary UDFs to persistent catalog and add it to temporary catalog', async () => {
    // arrange
    const tempUdfs = [{ namePath: ['temp_udf'] }];
    when(mockSqlHeaderAnalyzer.getAllFunctionDeclarations(anything(), anything(), anything())).thenReturn(Promise.resolve(tempUdfs));

    // act
    await zetaSqlWrapper.analyzeTable(FILE_PATH, COMPILED_SQL);

    // assert
    /* eslint-disable-next-line @typescript-eslint/unbound-method */
    const [request] = capture(mockZetaSQLClient.analyze).last();
    assertThat(request.simpleCatalog?.customFunction, tempUdfs);
    assertThat(zetaSqlWrapper['catalog'].customFunction, not(defined()));
  });
});
