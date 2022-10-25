import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
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

export function areRangesEqual(range1: Range, range2: Range): boolean {
  return (
    (comparePositions(range1.start, range2.start) === 0 && comparePositions(range1.end, range2.end) === 0) ||
    (comparePositions(range1.end, range2.start) === 0 && comparePositions(range1.start, range2.end) === 0)
  );
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
  const lines = text.slice(0, index).split('\n');
  return Position.create(lines.length - 1, lines[lines.length - 1].length);
}

export function getIdentifierRangeAtPosition(position: Position, text: string): Range {
  const lines = text.split('\n');
  if (lines.length === 0) {
    return Range.create(position, position);
  }
  return getWordRangeAtPosition(position, /[\w|`]+/, lines) ?? Range.create(position, position);
}

export function debounce(callback: () => void, delay: number): () => void {
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

// min and max included
export function randomNumber(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 *  @returns extracted dataset from full name
 */
export function extractDatasetFromFullName(fullName: string, tableName: string): string | undefined {
  const zeroOrOneQuote = '`?';
  const m = fullName.match(new RegExp(`${zeroOrOneQuote}([^.]*?)${zeroOrOneQuote}.${zeroOrOneQuote}${tableName}`));
  return m && m.length > 1 ? m[1] : undefined;
}

export function getFilePathRelatedToWorkspace(docUri: string, workspaceFolder: string): string {
  const docPath = URI.parse(docUri).fsPath;

  if (docPath.startsWith(workspaceFolder)) {
    return docPath.slice(workspaceFolder.length + 1);
  }

  throw new Error("Can't find path related to workspace");
}

export function arraysAreEqual(a1: string[], a2: string[]): boolean {
  return a1.length === a2.length && a1.every((value, index) => value === a2[index]);
}

export function truncateAtBothSides(text: string): string {
  return text.slice(1, -1);
}

export async function runWithTimeout(promise: Promise<unknown>, ms: number, error: string): Promise<void> {
  const timeoutPromise = new Promise<void>((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error(error));
    }, ms);
  });
  await Promise.race([promise, timeoutPromise]);
}

export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
