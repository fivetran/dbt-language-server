import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ParseLocationRangeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { assertThat } from 'hamjest';
import * as fs from 'node:fs';
import { ZetaSqlAst } from '../ZetaSqlAst';

describe('ZetaSqlAst', () => {
  const AST = new Map<string, AnalyzeResponse>();

  function getAst(fileName: string): AnalyzeResponse {
    let ast = AST.get(fileName);
    if (!ast) {
      const data = fs.readFileSync(`./server/src/test/ast/${fileName}.json`, 'utf8');
      ast = JSON.parse(data) as AnalyzeResponse;
      AST.set(fileName, ast);
    }
    return ast;
  }

  function shouldReturnLocationsOfTableNameInQuery(fileName: string, cursorOffset: number, ranges: ParseLocationRangeProto[]): void {
    // arrange
    const ast = getAst(fileName);

    // act
    const result = new ZetaSqlAst().getCompletionInfo(ast, cursorOffset);

    // assert
    assertThat(result.activeTableLocationRanges?.length, ranges.length);
    assertThat(result.activeTableLocationRanges?.sort(), ranges.sort());
  }

  function shouldReturnLocationOfTableNameInQuery(fileName: string, cursorOffset: number, start: number, end: number): void {
    shouldReturnLocationsOfTableNameInQuery(fileName, cursorOffset, [createParseLocationRange(start, end)]);
  }

  it('simple.json', () => {
    shouldReturnLocationOfTableNameInQuery('simple', 0, 14, 41);
    shouldReturnLocationOfTableNameInQuery('simple', 8, 14, 41);
    shouldReturnLocationOfTableNameInQuery('simple', 41, 14, 41);
  });

  it('multipleWith.json', () => {
    shouldReturnLocationOfTableNameInQuery('multipleWith', 35, 138, 191);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 45, 138, 191);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 160, 138, 191);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 191, 138, 191);

    shouldReturnLocationOfTableNameInQuery('multipleWith', 229, 530, 559);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 288, 530, 559);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 532, 530, 559);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 703, 530, 559);

    shouldReturnLocationOfTableNameInQuery('multipleWith', 1567, 1584, 1656);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 1576, 1584, 1656);
    shouldReturnLocationOfTableNameInQuery('multipleWith', 1656, 1584, 1656);
  });

  it('getCompletionInfo should return all with clause', () => {
    // arrange
    const ast = getAst('multipleWith');

    // act
    const result = new ZetaSqlAst().getCompletionInfo(ast, 0);

    // assert
    assertThat(result.withNames, new Set(['live_analytics_query', 'static_engineering_table', 'joined']));
  });

  describe('resolvedSetOperationScanNode.json', () => {
    it('shouldReturnTablesForResolvedSetOperationScanNode', () => {
      shouldReturnTablesForResolvedSetOperationScanNode(37);
      shouldReturnTablesForResolvedSetOperationScanNode(218);
      shouldReturnTablesForResolvedSetOperationScanNode(670);
      shouldReturnTablesForResolvedSetOperationScanNode(875);
    });
  });

  function shouldReturnTablesForResolvedSetOperationScanNode(cursorOffset: number): void {
    shouldReturnLocationsOfTableNameInQuery('resolvedSetOperationScanNode', cursorOffset, [
      createParseLocationRange(96, 141),
      createParseLocationRange(255, 300),
      createParseLocationRange(414, 459),
      createParseLocationRange(572, 617),
      createParseLocationRange(744, 800),
      createParseLocationRange(918, 967),
    ]);
  }
});

function createParseLocationRange(start: number, end: number): ParseLocationRangeProto {
  return { start, end, filename: '' };
}
