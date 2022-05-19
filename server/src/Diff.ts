import { diffWords } from 'diff';
import * as fastDiff from 'fast-diff';

export class Diff {
  static getOldLineNumber(oldString: string, newString: string, newLineNumber: number): number {
    return this.getOldNumber(oldString, newString, newLineNumber, str => Diff.getLinesCount(str));
  }

  static getOldCharacter(oldLine: string, newLine: string, newCharacter: number): number {
    return this.getOldNumberDeprecated(oldLine, newLine, newCharacter, str => str.length);
  }

  // TODO: try to get rid of this function
  static getOldNumberDeprecated(oldString: string, newString: string, newNumber: number, countFromDiff: (str: string) => number): number {
    const diffs = fastDiff(oldString, newString, 0);
    if (diffs.length === 0) {
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
      } else if (newNumber < currentNumber + diffCount) {
        oldNumber += newNumber - currentNumber;
        currentNumber = newNumber;
      } else {
        oldNumber += diffCount;
        currentNumber += diffCount;
      }

      if (currentNumber >= newNumber) {
        break;
      }
    }

    return oldNumber;
  }

  static getOldNumber(oldString: string, newString: string, newNumber: number, countFromDiff: (str: string) => number): number {
    const diffs = diffWords(oldString, newString, { ignoreWhitespace: false });
    if (diffs.length === 0) {
      return newNumber;
    }

    let oldNumber = 0;
    let currentNumber = 0;

    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const diffCount = countFromDiff(diff.value);

      if (diff.removed) {
        oldNumber += diffCount;
      } else if (diff.added) {
        if (newNumber < currentNumber + diffCount) {
          currentNumber = newNumber;
        } else {
          currentNumber += diffCount;
        }
      } else if (newNumber < currentNumber + diffCount) {
        oldNumber += newNumber - currentNumber;
        currentNumber = newNumber;
      } else {
        oldNumber += diffCount;
        currentNumber += diffCount;
      }

      if (currentNumber >= newNumber) {
        let removedAfter = 0;
        for (let j = i + 1; j < diffs.length; j++) {
          if (diffs[j].removed) {
            removedAfter += countFromDiff(diffs[j].value);
          } else {
            oldNumber += removedAfter;
            break;
          }
        }
        break;
      }
    }
    return oldNumber;
  }

  static getLinesCount(str: string): number {
    return (str.match(/\n/g) || []).length;
  }
}
