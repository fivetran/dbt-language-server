import { assertThat, instanceOf, throws } from 'hamjest';
import { Position, Range } from 'vscode-languageserver';
import { getWordRangeAtPosition } from '../../utils/TextUtils';

describe('TextUtils', () => {
  it('getWordRangeAtPosition should find words', () => {
    const textLines = ['aaaa bbbb+cccc abc'];
    assertWordRangeAtPosition(Position.create(0, 5), /[a-z+]+/, textLines, Range.create(0, 5, 0, 14));
    assertWordRangeAtPosition(Position.create(0, 17), /[a-z+]+/, textLines, Range.create(0, 15, 0, 18));
    assertWordRangeAtPosition(Position.create(0, 11), /yy/, textLines, undefined);
  });

  it('getWordRangeAtPosition should ignore bad regular expression', () => {
    const textLines = ['aaaa bbbb+cccc abc'];
    assertThat(() => getWordRangeAtPosition(Position.create(0, 2), /.*/, textLines), throws(instanceOf(Error)));
  });

  it('getWordRangeAtPosition should properly use regex', function () {
    const textLines = ['some text here', '/** foo bar */', 'function() {', '	"far boo"', '}'];
    assertWordRangeAtPosition(Position.create(0, 0), /\/\*.+\*\//, textLines, undefined);
    assertWordRangeAtPosition(Position.create(1, 0), /\/\*.+\*\//, textLines, Range.create(1, 0, 1, 14));
    assertWordRangeAtPosition(Position.create(3, 0), /("|').*\1/, textLines, undefined);
    assertWordRangeAtPosition(Position.create(3, 1), /("|').*\1/, textLines, Range.create(3, 1, 3, 10));
  });

  it('getWordRangeAtPosition should find word', function () {
    const regex = /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g;
    const line = 'int abcdefhijklmnopqwvrstxyz;';
    assertWordRangeAtPosition(Position.create(0, 27), regex, [line], Range.create(0, 4, 0, 28));
  });

  function assertWordRangeAtPosition(position: Position, regex: RegExp, textLines: string[], wordRange: Range | undefined): void {
    const range = getWordRangeAtPosition(position, regex, textLines);
    assertThat(range, wordRange);
  }
});
