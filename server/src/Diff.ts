import * as fastDiff from 'fast-diff';
import { Range } from 'vscode-languageserver';

export class Diff {
  static getRemovedRanges(oldString: string, newString: string): Range[] {
    const diffs = fastDiff(oldString, newString, 0);

    if (!diffs || diffs.length === 0) {
      return [];
    }

    const result = [];
    let currentLine = 0;
    let currentPosition = 0;
    let nextLine: number;
    let nextPosition: number;

    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const diffType = diff[0];
      const diffText = diff[1];

      if (diffType === fastDiff.DELETE || diffType === fastDiff.EQUAL) {
        const diffLinesCount = this.getLinesCount(diffText);
        const diffLastLineLength = this.getLastLineLength(diffText);

        nextLine = currentLine + diffLinesCount;
        nextPosition = diffLinesCount == 0 ? currentPosition + diffLastLineLength : diffLastLineLength;
      } else {
        continue;
      }

      if (diffType === fastDiff.DELETE) {
        result.push(Range.create(currentLine, currentPosition, nextLine, nextPosition));
      }

      currentLine = nextLine;
      currentPosition = nextPosition;
    }

    return result;
  }

  static getOldLineNumber(oldString: string, newString: string, newLineNumber: number): number {
    return this.getOldNumber(oldString, newString, newLineNumber, Diff.getLinesCount);
  }

  static getOldCharacter(oldLine: string, newLine: string, newCharacter: number): number {
    return this.getOldNumber(oldLine, newLine, newCharacter, str => str.length);
  }

  static getOldNumber(oldString: string, newString: string, newNumber: number, countFromDiff: (str: string) => number): number {
    const diffs = fastDiff(oldString, newString, 0);
    if (!diffs || diffs.length === 0) {
      return newNumber;
    }

    let oldNumber = 0;
    let currentNumber = 0;

    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const diffCount = countFromDiff(diff[1]);

      if (diff[0] === fastDiff.DELETE) {
        oldNumber += diffCount;
      } else if (diff[0] === fastDiff.INSERT) {
        if (newNumber < currentNumber + diffCount) {
          currentNumber = newNumber;
        } else {
          currentNumber += diffCount;
        }
      } else {
        if (newNumber < currentNumber + diffCount) {
          oldNumber += newNumber - currentNumber;
          currentNumber = newNumber;
        } else {
          oldNumber += diffCount;
          currentNumber += diffCount;
        }
      }

      if (currentNumber >= newNumber) {
        break;
      }
    }

    return oldNumber;
  }

  static getLinesCount(str: string): number {
    return (str.match(/\n/g) || []).length;
  }

  static getLastLineLength(str: string): number {
    const lastLineBreak = str.lastIndexOf('\n');
    return lastLineBreak == -1 ? str.length : str.length - lastLineBreak - 1;
  }

  static rangesEquals(first: Range, second: Range): boolean {
    return (
      first.start.line == second.start.line &&
      first.start.character == second.start.character &&
      first.end.line == second.end.line &&
      first.end.character == second.end.character
    );
  }

  static rangeContains(inner: Range, outer: Range): boolean {
    return (
      (inner.start.line > outer.start.line || (inner.start.line == outer.start.line && inner.start.character >= outer.start.character)) &&
      (inner.end.line < outer.end.line || (inner.end.line == outer.end.line && inner.end.character <= outer.end.character))
    );
  }
}
