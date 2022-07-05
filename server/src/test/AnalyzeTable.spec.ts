/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { assertThat, contains, hasProperty, hasSize } from 'hamjest';
import { anything, instance, mock, spy, verify, when } from 'ts-mockito';
import { BigQueryClient } from '../bigquery/BigQueryClient';
import { DbtRepository } from '../DbtRepository';
import { ZetaSqlParser } from '../ZetaSqlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';

describe('ZetaSqlWrapper analyzeTable', () => {
  it('analyzeTable should register tables and udfs before calling analyze', async () => {
    // arrange
    const compiledSql = 'select * from dataset.table t where t.id = dataset.udf(1)';

    ZetaSQLClient.getInstance = (): ZetaSQLClient => instance(mockZetaSQLClient);

    const mockZetaSqlParser = mock(ZetaSqlParser);
    const mockBigQueryClient = mock(BigQueryClient);
    const mockDbtRepository = mock(DbtRepository);
    const mockZetaSQLClient = mock(ZetaSQLClient);

    const originalFilePath = 'original/file/path';
    when(mockDbtRepository.models).thenReturn([
      {
        uniqueId: 'id',
        name: 'main_table',
        packageName: 'packageName',
        rootPath: 'rootPath',
        originalFilePath,
        database: 'db',
        schema: 'schema',
        dependsOn: {
          nodes: [],
        },
        refs: [[]],
      },
    ]);

    const zetaSqlWrapper = new ZetaSqlWrapper(instance(mockDbtRepository), instance(mockBigQueryClient), instance(mockZetaSqlParser));
    zetaSqlWrapper['languageOptions'] = new LanguageOptions();

    when(mockZetaSqlParser.getAllFunctions(compiledSql)).thenReturn(Promise.resolve([['dataset', 'udf']]));
    when(mockZetaSQLClient.extractTableNamesFromStatement(anything())).thenReturn(
      Promise.resolve({ tableName: [{ tableNameSegment: ['dataset', 'table'] }] }),
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

    when(mockZetaSqlParser.getAllFunctions(compiledSql)).thenReturn(Promise.resolve([['dataset', 'udf']]));
    when(mockBigQueryClient.getUdf(undefined, 'dataset', 'udf')).thenReturn(
      Promise.resolve({
        nameParts: ['dataset', 'udf'],
      }),
    );

    when(mockZetaSQLClient.analyze(anything())).thenReturn(
      Promise.resolve({
        resumeBytePosition: 0,
        result: 'resolvedStatement',
      }),
    );
    const spiedZetaSqlWrapper = spy(zetaSqlWrapper);

    // act
    await zetaSqlWrapper.analyzeTable(originalFilePath, compiledSql);

    // assert
    verify(spiedZetaSqlWrapper.registerTable(anything())).twice();
    verify(spiedZetaSqlWrapper.registerUdf(anything())).once();
    verify(spiedZetaSqlWrapper.fillTableWithAnalyzeResponse(anything(), anything())).once();
    assertThat(zetaSqlWrapper['registeredTables'], hasSize(2));
    assertThat(
      zetaSqlWrapper['registeredTables'],
      contains(hasProperty('namePath', ['dataset', 'table']), hasProperty('namePath', ['db', 'schema', 'main_table'])),
    );
    assertThat(zetaSqlWrapper['registeredFunctions'], hasSize(1));
  });
});
