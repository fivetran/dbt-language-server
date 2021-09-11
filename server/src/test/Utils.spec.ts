import assert = require('assert');
import { Position, Range } from 'vscode-languageserver-types';
import { comparePositions, rangesOverlap } from '../Utils';

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
});
