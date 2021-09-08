import { Position, Range } from 'vscode-languageserver-types';
import { comparePositions, rangesOverlap } from '../Utils';

describe('Utils', () => {
  it('comparePositions_shouldComparePositions', () => {
    expect(comparePositions(Position.create(0, 0), Position.create(1, 1))).toEqual(-1);
    expect(comparePositions(Position.create(1, 0), Position.create(1, 1))).toEqual(-1);
    expect(comparePositions(Position.create(1, 1), Position.create(1, 1))).toEqual(0);
    expect(comparePositions(Position.create(1, 1), Position.create(1, 0))).toEqual(1);
    expect(comparePositions(Position.create(1, 1), Position.create(0, 0))).toEqual(1);
  });

  it('rangesOverlap_shouldCheckIfRangesOverlap', () => {
    expect(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 0, 0, 1))).toBe(true);
    expect(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 1, 1, 1))).toBe(true);
    expect(rangesOverlap(Range.create(1, 1, 3, 3), Range.create(0, 0, 2, 2))).toBe(true);

    expect(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 2, 1, 1))).toBe(false);
    expect(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(1, 0, 1, 1))).toBe(false);
    expect(rangesOverlap(Range.create(2, 2, 3, 3), Range.create(1, 1, 2, 1))).toBe(false);
  });
});
