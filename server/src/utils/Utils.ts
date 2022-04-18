import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getWordRangeAtPosition } from './TextUtils';

export function rangesOverlap(range1: Range, range2: Range): boolean {
  return (
    positionInRange(range2.start, range1) ||
    positionInRange(range2.end, range1) ||
    positionInRange(range1.start, range2) ||
    positionInRange(range1.end, range2)
  );
}

export function comparePositions(position1: Position, position2: Position): number {
  if (position1.line < position2.line) {
    return -1;
  }
  if (position1.line > position2.line) {
    return 1;
  }

  if (position1.character < position2.character) {
    return -1;
  }
  if (position1.character > position2.character) {
    return 1;
  }

  return 0;
}

export function getAbsoluteRange(absolutePosition: Position, relativeRange: Range): Range {
  return Range.create(getAbsolutePosition(absolutePosition, relativeRange.start), getAbsolutePosition(absolutePosition, relativeRange.end));
}

export function getAbsolutePosition(absolute: Position, relative: Position): Position {
  return Position.create(absolute.line + relative.line, relative.line === 0 ? absolute.character + relative.character : relative.character);
}

export function getRelativePosition(absoluteRange: Range, absolutePosition: Position): Position | undefined {
  if (!positionInRange(absolutePosition, absoluteRange)) {
    return undefined;
  }
  return Position.create(
    absolutePosition.line - absoluteRange.start.line,
    absolutePosition.line === absoluteRange.start.line ? absolutePosition.character - absoluteRange.start.character : absolutePosition.character,
  );
}

export function getPositionByIndex(text: string, index: number): Position {
  const lines = text.substring(0, index).split('\n');
  return Position.create(lines.length - 1, lines[lines.length - 1].length);
}

export function getIdentifierRangeAtPosition(position: Position, text: string): Range {
  const lines = text.split('\n');
  if (lines.length === 0) {
    return Range.create(position, position);
  }
  return getWordRangeAtPosition(position, /[\w|`]+/, lines) ?? Range.create(position, position);
}

export function debounce(callback: () => any, delay: number): () => void {
  let timeout: NodeJS.Timeout;
  return (): void => {
    clearTimeout(timeout);
    timeout = setTimeout(callback, delay);
  };
}

export function getJinjaContentOffset(doc: TextDocument, cursorPos: Position): number {
  let offset = doc.offsetAt(cursorPos) - 1;
  const text = doc.getText();
  while (offset >= 0) {
    if (['}', '#', '%'].includes(text[offset]) && offset - 1 >= 0 && text[offset - 1] === '}') {
      return -1;
    }

    if (['{', '#', '%'].includes(text[offset]) && offset - 1 >= 0 && text[offset - 1] === '{') {
      return offset + 1;
    }
    offset--;
  }
  return -1;
}

export function positionInRange(position: Position, range: Range): boolean {
  return comparePositions(range.start, position) <= 0 && comparePositions(range.end, position) >= 0;
}

interface DeferredResult<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  promise: Promise<T>;
}

export const deferred = <T>(): DeferredResult<T> => {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: any) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return {
    resolve,
    reject,
    promise,
  };
};

// min and max included
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 *  @returns extracted dataset from full name
 *  @throws error otherwise
 */
export function extractDatasetFromFullName(fullName: string, tableName: string): string {
  const zeroOrOneQuote = '`?';
  const m = fullName.match(new RegExp(`${zeroOrOneQuote}([^.]*?)${zeroOrOneQuote}.${zeroOrOneQuote}${tableName}`));
  if (m && m.length > 1) {
    return m[1];
  }
  throw new Error("Can't extract dataset");
}

export function getFilePathRelatedToWorkspace(docUri: string, workspaceFolder: string): string {
  const index = docUri.indexOf(workspaceFolder);
  return docUri.slice(index + workspaceFolder.length + 1);
}
