import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { assertThat } from 'hamjest';
import { positionInRange, rangeContainsRange, rangesEqual } from '../../utils/ZetaSqlUtils';

describe('ZetaSqlUtils.spec', () => {
  it('positionInRange should return whether the range contains specified position', () => {
    assertThat(positionInRange(5, createRange(5, 8)), true);
    assertThat(positionInRange(7, createRange(5, 8)), true);
    assertThat(positionInRange(8, createRange(5, 8)), true);

    assertThat(positionInRange(4, createRange(5, 8)), false);
    assertThat(positionInRange(9, createRange(5, 8)), false);
  });

  it('rangeContainsRange should return whether the range contains another range', () => {
    assertThat(rangeContainsRange(createRange(5, 8), createRange(5, 6)), true);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(6, 7)), true);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(7, 8)), true);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(5, 8)), true);

    assertThat(rangeContainsRange(createRange(5, 8), createRange(5, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(4, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(8, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(9, 9)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(1, 3)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(4, 5)), false);
    assertThat(rangeContainsRange(createRange(5, 8), createRange(4, 9)), false);
  });

  it('rangesEqual should return whether the ranges are equal', () => {
    assertThat(rangesEqual(createRange(5, 8), createRange(5, 8)), true);

    assertThat(rangesEqual(createRange(5, 8), createRange(4, 8)), false);
    assertThat(rangesEqual(createRange(5, 8), createRange(5, 9)), false);
    assertThat(rangesEqual(createRange(4, 8), createRange(5, 8)), false);
    assertThat(rangesEqual(createRange(5, 9), createRange(5, 8)), false);
    assertThat(rangesEqual(createRange(1, 3), createRange(5, 8)), false);
    assertThat(rangesEqual(createRange(5, 8), createRange(1, 3)), false);
  });
});

function createRange(start: number, end: number): ParseLocationRangeProto__Output {
  return { filename: '', start, end };
}
