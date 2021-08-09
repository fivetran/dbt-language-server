import { Change, diffLines } from 'diff';

export class DiffTracker {
  static getOldLineNumber(oldString: string, newString: string, newLineNumber: number) {
    const diffs = diffLines(oldString, newString);

    if (!diffs || diffs.length === 0) {
      return newLineNumber;
    }

    let oldLineNumber = 0;
    let currentLine = 0;

    for (let i = 0; i < diffs.length; i++) {
      const diff = diffs[i];
      if (diff.count) {
        if (diff.removed) {
          oldLineNumber += diff.count;
        } else if (diff.added) {
          if (newLineNumber < currentLine + diff.count) {
            currentLine = newLineNumber;
          } else {
            if (newLineNumber === currentLine + diff.count) {
              oldLineNumber += DiffTracker.getLastDeletedLines(diffs, i);
            }
            currentLine += diff.count;
          }
        } else {
          if (newLineNumber < currentLine + diff.count) {
            oldLineNumber += newLineNumber - currentLine;
            currentLine = newLineNumber;
          } else {
            if (newLineNumber === currentLine + diff.count) {
              oldLineNumber += diff.count + DiffTracker.getLastDeletedLines(diffs, i);
            } else {
              oldLineNumber += diff.count;
            }
            currentLine += diff.count;
          }
        }
      }

      if (currentLine >= newLineNumber) {
        break;
      }
    }

    return oldLineNumber;
  }

  static getLastDeletedLines(diffs: Change[], lastIndex: number) {
    if (diffs.length - lastIndex > 2) {
      if (diffs[lastIndex + 1].removed && !diffs[lastIndex + 2].removed && !diffs[lastIndex + 2].added) {
        return diffs[lastIndex + 1].count ?? 0;
      }
    }
    return 0;
  }
}
