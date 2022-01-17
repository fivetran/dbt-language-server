import * as assert from 'assert';
import * as fs from 'fs';
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JinjaParser } from '../JinjaParser';

describe('JinjaParser', () => {
  it('findAllJinjaRanges_shouldFindAllJinjaRanges', () => {
    shouldFindAllJinjaRanges('simple_query', []);
    shouldFindAllJinjaRanges('without_expressions', []);
    shouldFindAllJinjaRanges('one_at_the_beginning', [Range.create(0, 0, 7, 2)]);
    shouldFindAllJinjaRanges('one_at_the_end', [Range.create(8, 0, 8, 27)]);
    shouldFindAllJinjaRanges('four', [
      Range.create(0, 0, 0, 54),
      Range.create(1, 5, 1, 22),
      Range.create(1, 43, 1, 58),
      Range.create(2, 0, 2, 14),
      Range.create(0, 0, 2, 14),
    ]);
    shouldFindAllJinjaRanges('five', [
      Range.create(0, 0, 0, 73),
      Range.create(4, 4, 4, 47),
      Range.create(5, 36, 5, 54),
      Range.create(5, 76, 5, 94),
      Range.create(6, 4, 6, 16),
      Range.create(4, 4, 6, 16),
    ]);
  });

  it('Should fail with extra open jinja blocks', () => {
    shouldFail('extra_if');
  });

  it('Should fail with extra close jinja blocks', () => {
    shouldFail('extra_endif');
  });

  function shouldFindAllJinjaRanges(fileName: string, ranges: Range[]): void {
    const result = findAllJinjaRangesInFile(fileName);
    assert.strictEqual(result?.length, ranges.length);
    assert.deepStrictEqual(result, ranges);
  }

  function shouldFail(fileName: string): void {
    const result = findAllJinjaRangesInFile(fileName);
    assert.strictEqual(result, undefined);
  }

  function findAllJinjaRangesInFile(fileName: string): Range[] | undefined {
    const doc = TextDocument.create('uri', 'id', 1, fs.readFileSync(`${__dirname}/../../src/test/sql_files/${fileName}.sql`, 'utf8'));
    return new JinjaParser().findAllJinjaRanges(doc);
  }
});
