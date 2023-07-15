import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';

interface Node {
  node: string;
  [key: string]: unknown;
}

export function positionInRange(position: number, range: ParseLocationRangeProto__Output): boolean {
  return range.start <= position && position <= range.end;
}

export function rangeContainsRange(outerRange: ParseLocationRangeProto__Output, innerRange: ParseLocationRangeProto__Output): boolean {
  return outerRange.start <= innerRange.start && innerRange.end <= outerRange.end;
}

export function rangesEqual(range1: { start: number; end: number }, range2: { start: number; end: number }): boolean {
  return range1.start === range2.start && range1.end === range2.end;
}

export function traverse(
  unknownNode: unknown,
  actions: Map<
    string,
    {
      actionBefore: (node: unknown) => void;
      actionAfter?: (node: unknown) => void;
    }
  >,
): void {
  const node = unknownNode as Node;

  const nodeActions = actions.get(node.node);
  if (nodeActions) {
    nodeActions.actionBefore(node[node.node]);
  }

  for (const key of Object.keys(node)) {
    const child = node[key];
    if (typeof child === 'object' && child !== null) {
      traverse(child, actions);
    }
  }

  if (nodeActions?.actionAfter) {
    nodeActions.actionAfter(node[node.node]);
  }
}

export function createSimpleColumn(name: string, type: TypeProto | null): SimpleColumnProto {
  return { name, type };
}
