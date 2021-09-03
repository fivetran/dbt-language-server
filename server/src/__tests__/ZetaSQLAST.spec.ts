import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import * as fs from 'fs';
import { ZetaSQLAST } from '../ZetaSQLAST';

describe('ZetaSQLAST', () => {
  function createAST(fileName: string): AnalyzeResponse {
    const data = fs.readFileSync(`./src/__tests__/ast/${fileName}.json`, 'utf8');
    return JSON.parse(data);
  }

  function getCompletionInfo_shouldReturnLocationOfTableNameInQuery(fileName: string, cursorOffset: number, start: number, end: number) {
    // arrange
    const ast = createAST(fileName);

    // act
    const result = new ZetaSQLAST().getCompletionInfo(ast, cursorOffset);

    // assert
    expect(result.activeTableLocationRange?.start).toBe(start);
    expect(result.activeTableLocationRange?.end).toBe(end);
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
});
