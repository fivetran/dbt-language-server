import { Change, diffWords } from 'diff';
import { Position } from 'vscode-languageserver';
import { DiffUtils } from './utils/DiffUtils';

export class PositionConverter {
  diffs?: Change[];

  firstLines?: string[];
  secondLines?: string[];

  constructor(private first: string, private second: string) {}

  private getDiffs(): Change[] {
    if (this.diffs === undefined) {
      this.diffs = diffWords(this.first, this.second, { ignoreWhitespace: false });
    }
    return this.diffs;
  }

  getFirstLines(): string[] {
    if (this.firstLines === undefined) {
      this.firstLines = this.first.split('\n');
    }
    return this.firstLines;
  }

  getSecondLines(): string[] {
    if (this.secondLines === undefined) {
      this.secondLines = this.second.split('\n');
    }
    return this.secondLines;
  }

  convertPositionBackward(positionInSecond: Position): Position {
    const firstLines = this.getFirstLines();
    const secondLines = this.getSecondLines();

    const lineInFirst = DiffUtils.getOldNumber(positionInSecond.line, str => DiffUtils.getLinesCount(str), this.getDiffs());
    const charInFirst = DiffUtils.getOldCharacter(firstLines[lineInFirst], secondLines[positionInSecond.line], positionInSecond.character);
    return {
      line: lineInFirst,
      character: charInFirst,
    };
  }

  convertPositionStraight(positionInFirst: Position): Position {
    const firstLines = this.getFirstLines();
    const secondLines = this.getSecondLines();

    const lineInSecond = DiffUtils.getNewNumber(positionInFirst.line, str => DiffUtils.getLinesCount(str), this.getDiffs());
    const charInSecond = DiffUtils.getNewCharacter(firstLines[positionInFirst.line], secondLines[lineInSecond], positionInFirst.character);
    return {
      line: lineInSecond,
      character: charInSecond,
    };
  }
}
