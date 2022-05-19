import { diffWords } from 'diff';
import * as fastDiff from 'fast-diff';

export class Diff {
  static getOldLineNumber(oldString: string, newString: string, newLineNumber: number): number {
    return this.getOldNumber(oldString, newString, newLineNumber, str => Diff.getLinesCount(str));
  }

  static getOldCharacter(oldLine: string, newLine: string, newCharacter: number): number {
    return this.getOldNumberDeprecated(oldLine, newLine, newCharacter, str => str.length);
  }

  static getNewLineNumber(oldString: string, newString: string, oldNumber: number): number {
    return this.getNewNumber(oldString, newString, oldNumber, str => Diff.getLinesCount(str));
  }

  static getNewCharacter(oldLine: string, newLine: string, oldCharacter: number): number {
    return this.getNewNumber(oldLine, newLine, oldCharacter, str => str.length);
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

  static getNewNumber(oldString: string, newString: string, oldNumber: number, countFromDiff: (str: string) => number): number {
    const diffs = diffWords(oldString, newString, { ignoreWhitespace: false });
    if (diffs.length === 0) {
      return oldNumber;
    }

    let newNumber = 0;
    let currentNumber = 0;

    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const diffCount = countFromDiff(diff.value);

      if (diff.removed) {
        currentNumber += diffCount;
      } else if (diff.added) {
        newNumber += diffCount;
      } else if (currentNumber + diffCount >= oldNumber) {
        newNumber += oldNumber - currentNumber;
        break;
      } else {
        currentNumber += diffCount;
        newNumber += diffCount;
      }
    }

    return newNumber;
  }

  static getLinesCount(str: string): number {
    return (str.match(/\n/g) || []).length;
  }
}
