import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';

export function positionInRange(position: number, range: ParseLocationRangeProto__Output): boolean {
  return range.start <= position && position <= range.end;
}

export function rangeContainsRange(outerRange: ParseLocationRangeProto__Output, innerRange: ParseLocationRangeProto__Output): boolean {
  return outerRange.start <= innerRange.start && innerRange.end <= outerRange.end;
}

export function rangesEqual(range1: ParseLocationRangeProto__Output, range2: ParseLocationRangeProto__Output): boolean {
  return range1.start === range2.start && range1.end === range2.end;
}
