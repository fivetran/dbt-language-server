import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ParseLocationRangeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import assert = require('assert');
import * as fs from 'fs';
import { ZetaSQLAST } from '../ZetaSQLAST';

describe('ZetaSQLAST', () => {
  function createAST(fileName: string): AnalyzeResponse {
    const data = fs.readFileSync(__dirname + `/../../src/test/ast/${fileName}.json`, 'utf8');
    return JSON.parse(data);
  }

  function getCompletionInfo_shouldReturnLocationsOfTableNameInQuery(fileName: string, cursorOffset: number, ranges: ParseLocationRangeProto[]) {
    // arrange
    const ast = createAST(fileName);

    // act
    const result = new ZetaSQLAST().getCompletionInfo(ast, cursorOffset);

    // assert
    assert.strictEqual(result.activeTableLocationRanges?.length, ranges.length);
    assert.deepStrictEqual(result.activeTableLocationRanges?.sort(), ranges.sort());
  }

  function getCompletionInfo_shouldReturnLocationOfTableNameInQuery(fileName: string, cursorOffset: number, start: number, end: number) {
    getCompletionInfo_shouldReturnLocationsOfTableNameInQuery(fileName, cursorOffset, [createParseLocationRange(start, end)]);
  }

  function createParseLocationRange(start: number, end: number): ParseLocationRangeProto {
    return { start: start, end: end, filename: '' };
  }

  it('simple.json', () => {
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('simple', 0, 14, 41);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('simple', 8, 14, 41);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('simple', 41, 14, 41);
  });

  it('multipleWith.json', () => {
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 35, 140, 193);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 45, 140, 193);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 160, 140, 193);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 193, 140, 193);

    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 229, 532, 561);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 288, 532, 561);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 532, 532, 561);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 705, 532, 561);

    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 1567, 1586, 1658);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 1576, 1586, 1658);
    getCompletionInfo_shouldReturnLocationOfTableNameInQuery('multipleWith', 1658, 1586, 1658);
  });

  describe('resolvedSetOperationScanNode.json', () => {
    function shouldReturnTablesForresolvedSetOperationScanNode(cursorOffset: number) {
      getCompletionInfo_shouldReturnLocationsOfTableNameInQuery('resolvedSetOperationScanNode', cursorOffset, [
        createParseLocationRange(97, 142),
        createParseLocationRange(256, 301),
        createParseLocationRange(415, 460),
        createParseLocationRange(573, 618),
        createParseLocationRange(745, 801),
        createParseLocationRange(919, 968),
      ]);
    }

    it('shouldReturnTablesForresolvedSetOperationScanNode', () => {
      shouldReturnTablesForresolvedSetOperationScanNode(37);
      shouldReturnTablesForresolvedSetOperationScanNode(218);
      shouldReturnTablesForresolvedSetOperationScanNode(670);
      shouldReturnTablesForresolvedSetOperationScanNode(875);
    });
  });
});
