import fastDiff = require('fast-diff');

export class Diff {
  static getOldLineNumber(oldString: string, newString: string, newLineNumber: number): number {
    const diffs = fastDiff(oldString, newString, 0);
    if (!diffs || diffs.length === 0) {
      return newLineNumber;
    }

    let oldLineNumber = 0;
    let currentLine = 0;

    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      const linesCount = Diff.getLinesCount(diff[1]);

      if (diff[0] === fastDiff.DELETE) {
        oldLineNumber += linesCount;
      } else if (diff[0] === fastDiff.INSERT) {
        if (newLineNumber < currentLine + linesCount) {
          currentLine = newLineNumber;
        } else {
          currentLine += linesCount;
        }
      } else {
        if (newLineNumber < currentLine + linesCount) {
          oldLineNumber += newLineNumber - currentLine;
          currentLine = newLineNumber;
        } else {
          oldLineNumber += linesCount;
          currentLine += linesCount;
        }
      }

      if (currentLine >= newLineNumber) {
        break;
      }
    }

    return oldLineNumber;
  }

  static getLinesCount(str: string) {
    return (str.match(/\n/g) || []).length;
  }
}
