import * as assert from 'assert';
import * as fs from 'fs';
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JinjaParser } from '../JinjaParser';

describe('JinjaParser', () => {
  function shouldFindAllJinjas(fileName: string, ranges: Range[]): void {
    // arrange
    const doc = TextDocument.create('uri', 'id', 1, fs.readFileSync(`${__dirname}/../../src/test/sql_files/${fileName}.sql`, 'utf8'));

    // act
    const jinjas = new JinjaParser().findAllJinjas(doc);

    // assert
    assert.strictEqual(jinjas?.length, ranges.length);
    assert.deepStrictEqual(jinjas, ranges);
  }

  it('findAllJinjas_shouldFindAllJinjas', () => {
    shouldFindAllJinjas('simple_query', []);
    shouldFindAllJinjas('without_expressions', []);
    shouldFindAllJinjas('one_at_the_beginning', [Range.create(0, 0, 7, 2)]);
    shouldFindAllJinjas('one_at_the_end', [Range.create(8, 0, 8, 27)]);
    shouldFindAllJinjas('four', [Range.create(0, 0, 0, 54), Range.create(1, 5, 1, 22), Range.create(1, 43, 1, 58), Range.create(2, 0, 2, 14)]);
    shouldFindAllJinjas('five', [
      Range.create(0, 0, 0, 73),
      Range.create(4, 4, 4, 47),
      Range.create(5, 36, 5, 54),
      Range.create(5, 76, 5, 94),
      Range.create(6, 4, 6, 16),
    ]);
  });
});
