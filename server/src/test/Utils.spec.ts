import * as assert from 'assert';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range } from 'vscode-languageserver-types';
import { comparePositions, extractDatasetFromFullName, getJinjaContentOffset, rangesOverlap } from '../Utils';

describe('Utils', () => {
  it('comparePositions_shouldComparePositions', () => {
    assert.strictEqual(comparePositions(Position.create(0, 0), Position.create(1, 1)), -1);
    assert.strictEqual(comparePositions(Position.create(1, 0), Position.create(1, 1)), -1);
    assert.strictEqual(comparePositions(Position.create(1, 1), Position.create(1, 1)), 0);
    assert.strictEqual(comparePositions(Position.create(1, 1), Position.create(1, 0)), 1);
    assert.strictEqual(comparePositions(Position.create(1, 1), Position.create(0, 0)), 1);
  });

  it('rangesOverlap_shouldCheckIfRangesOverlap', () => {
    assert.strictEqual(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 0, 0, 1)), true);
    assert.strictEqual(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 1, 1, 1)), true);
    assert.strictEqual(rangesOverlap(Range.create(1, 1, 3, 3), Range.create(0, 0, 2, 2)), true);
    assert.strictEqual(rangesOverlap(Range.create(1, 1, 1, 3), Range.create(0, 0, 3, 3)), true);
    assert.strictEqual(rangesOverlap(Range.create(0, 0, 3, 3), Range.create(1, 1, 1, 3)), true);
    assert.strictEqual(rangesOverlap(Range.create(1, 1, 5, 3), Range.create(0, 0, 3, 3)), true);
    assert.strictEqual(rangesOverlap(Range.create(0, 0, 3, 3), Range.create(1, 1, 5, 3)), true);

    assert.strictEqual(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 2, 1, 1)), false);
    assert.strictEqual(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(1, 0, 1, 1)), false);
    assert.strictEqual(rangesOverlap(Range.create(2, 2, 3, 3), Range.create(1, 1, 2, 1)), false);
    assert.strictEqual(rangesOverlap(Range.create(0, 2, 1, 1), Range.create(0, 0, 0, 1)), false);
    assert.strictEqual(rangesOverlap(Range.create(1, 0, 1, 1), Range.create(0, 0, 0, 1)), false);
    assert.strictEqual(rangesOverlap(Range.create(1, 1, 2, 1), Range.create(2, 2, 3, 3)), false);
  });

  describe('getJinjaContentOffset', () => {
    it('getJinjaContentOffset should return jinja content offset', () => {
      shouldReturnJinjaContentOffset('{{', 0, -1);
      shouldReturnJinjaContentOffset('{{', 1, -1);
      shouldReturnJinjaContentOffset('{}', 1, -1);
      shouldReturnJinjaContentOffset('{ {}}', 3, -1);
      shouldReturnJinjaContentOffset('{$$}', 2, -1);
      shouldReturnJinjaContentOffset('}{}}', 2, -1);
      shouldReturnJinjaContentOffset('}##}', 2, -1);
      shouldReturnJinjaContentOffset('}%%}', 2, -1);

      shouldReturnJinjaContentOffset('{{', 2, 2);
      shouldReturnJinjaContentOffset('{{ref(', 6, 2);
      shouldReturnJinjaContentOffset('{{}}', 2, 2);
      shouldReturnJinjaContentOffset('{##}', 2, 2);
      shouldReturnJinjaContentOffset('{%%}', 2, 2);
    });

    function shouldReturnJinjaContentOffset(docContent: string, cursorCharPos: number, expected: number): void {
      assert.strictEqual(getJinjaContentOffset(TextDocument.create('test', 'sql', 0, docContent), Position.create(0, cursorCharPos)), expected);
    }
  });
  it('extractDatasetFromFullName should extract dataset', () => {
    assert.strictEqual(extractDatasetFromFullName('`project`.`dataset`.`table`', 'table'), 'dataset');
    assert.strictEqual(extractDatasetFromFullName('`project`.`dataset`.table', 'table'), 'dataset');
    assert.strictEqual(extractDatasetFromFullName('`project`.dataset.table', 'table'), 'dataset');
    assert.strictEqual(extractDatasetFromFullName('project.`dataset`.table', 'table'), 'dataset');
    assert.strictEqual(extractDatasetFromFullName('project.dataset.table', 'table'), 'dataset');
    assert.strictEqual(extractDatasetFromFullName('`project.dataset.table`', 'table'), 'dataset');
  });
});
