/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { ok } from 'neverthrow';
import { anything, instance, mock, objectContaining, spy, verify, when } from 'ts-mockito';
import { BigQueryClient } from '../bigquery/BigQueryClient';
import { Dag } from '../dag/Dag';
import { DagNode } from '../dag/DagNode';
import { DbtRepository } from '../DbtRepository';
import { ProjectAnalyzer } from '../ProjectAnalyzer';
import { SqlHeaderAnalyzer } from '../SqlHeaderAnalyzer';
import { TableDefinition } from '../TableDefinition';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import path = require('node:path');

describe('ProjectAnalyzer analyzeModelsTree', () => {
  const ORIGINAL_FILE_PATH = 'models/model.sql';
  const FILE_PATH = path.join('/home/project', ORIGINAL_FILE_PATH);
  const COMPILED_SQL = 'select * from dataset.table t where t.id = dataset.udf(1)';
  const INTERNAL_TABLE_NAME_PATH = ['dataset', 'table'];
  const MAIN_TABLE_NAME_PATH = ['db', 'schema', 'main_table'];
  const UDF_NAME_PATH = ['dataset', 'udf'];
  const DAG_NODE = new DagNode({
    uniqueId: 'id',
    name: 'main_table',
    packageName: 'packageName',
    originalFilePath: ORIGINAL_FILE_PATH,
    database: 'db',
    schema: 'schema',
    rawCode: 'raw_sql',
    compiledCode: 'compiled_sql',
    dependsOn: {
      nodes: [],
    },
    refs: [[]],
    config: {
      sqlHeader: 'sql_header',
    },
  });

  let projectAnalyzer: ProjectAnalyzer;
  let spiedProjectAnalyzer: ProjectAnalyzer;
  let mockBigQueryClient: BigQueryClient;
  let mockSqlHeaderAnalyzer: SqlHeaderAnalyzer;
  let mockZetaSqlWrapper: ZetaSqlWrapper;

  before(() => {
    const mockDbtRepository = mock(DbtRepository);
    mockZetaSqlWrapper = mock(ZetaSqlWrapper);
    mockBigQueryClient = mock(BigQueryClient);
    mockSqlHeaderAnalyzer = mock(SqlHeaderAnalyzer);

    when(mockDbtRepository.dag).thenReturn(new Dag([DAG_NODE]));
    when(mockDbtRepository.getNodeFullPath(objectContaining({ originalFilePath: ORIGINAL_FILE_PATH }))).thenReturn(FILE_PATH);

    when(mockSqlHeaderAnalyzer.getAllFunctionDeclarations(anything(), anything(), anything())).thenReturn(Promise.resolve([]));

    projectAnalyzer = new ProjectAnalyzer(instance(mockDbtRepository), 'projectName', instance(mockBigQueryClient), instance(mockZetaSqlWrapper));

    when(mockZetaSqlWrapper.findTableNames(COMPILED_SQL)).thenReturn(Promise.resolve([new TableDefinition(INTERNAL_TABLE_NAME_PATH)]));

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

    when(mockBigQueryClient.getUdf(undefined, 'dataset', 'udf')).thenReturn(
      Promise.resolve({
        nameParts: UDF_NAME_PATH,
      }),
    );

    when(mockZetaSqlWrapper.getAstOrError(anything(), anything())).thenReturn(
      Promise.resolve(
        ok({
          resumeBytePosition: 0,
          result: 'resolvedStatement',
        }),
      ),
    );
    spiedProjectAnalyzer = spy(projectAnalyzer);
  });

  it('analyzeModelsTree should register tables and udfs before calling analyze', async () => {
    // act
    await projectAnalyzer.analyzeModelTree(DAG_NODE, COMPILED_SQL);

    // assert
    verify(mockZetaSqlWrapper.registerTable(objectContaining({ namePath: INTERNAL_TABLE_NAME_PATH }))).calledBefore(
      mockZetaSqlWrapper.registerTable(objectContaining({ namePath: MAIN_TABLE_NAME_PATH })),
    );

    verify(mockZetaSqlWrapper.registerTable(anything())).twice();
    verify(mockZetaSqlWrapper.registerPersistentUdfs(anything())).once();
    verify(spiedProjectAnalyzer['fillTableWithAnalyzeResponse'](anything(), anything())).once();

    verify(mockZetaSqlWrapper.registerPersistentUdfs(anything())).calledBefore(mockZetaSqlWrapper.getAstOrError(anything(), anything()));
  });
});
