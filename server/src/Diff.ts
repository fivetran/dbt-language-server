import * as fastDiff from 'fast-diff';

export interface Range {
  startLine: number;
  startPosition: number;
  endLine: number;
  endPosition: number;
}

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
        result.push({
          startLine: currentLine,
          startPosition: currentPosition,
          endLine: nextLine,
          endPosition: nextPosition,
        });
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
    const lastLineBreak = str.lastIndexOf('/n');
    return lastLineBreak == -1 ? str.length : str.length - lastLineBreak - 1;
  }

  static isRangeInsideAnother(test: Range, range: Range): boolean {
    return (
      (test.startLine > range.startLine || (test.startLine == range.startLine && test.startPosition >= range.startPosition)) &&
      (test.endLine < range.endLine || (test.endLine == range.endLine && test.endPosition <= range.endPosition))
    );
  }
}
