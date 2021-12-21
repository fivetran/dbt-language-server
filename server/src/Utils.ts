import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

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

function positionInRange(position: Position, range: Range): boolean {
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
