import { strictEqual } from 'assert';
import { assertThat, instanceOf, throws } from 'hamjest';
import { Position, Range } from 'vscode-languageserver';
import { getWordRangeAtPosition } from '../../utils/TextUtils';

describe('TextUtils', () => {
  it('getWordRangeAtPosition should find words', () => {
    const textLines = ['aaaa bbbb+cccc abc'];
    let range: Range | undefined;

    range = getWordRangeAtPosition(Position.create(0, 5), /[a-z+]+/, textLines);
    assertThat(range, Range.create(0, 5, 0, 14));

    range = getWordRangeAtPosition(Position.create(0, 17), /[a-z+]+/, textLines);
    assertThat(range, Range.create(0, 15, 0, 18));

    range = getWordRangeAtPosition(Position.create(0, 11), /yy/, textLines);
    assertThat(range, undefined);
  });

  it('getWordRangeAtPosition should ignore bad regular expression', () => {
    const textLines = ['aaaa bbbb+cccc abc'];
    assertThat(() => getWordRangeAtPosition(Position.create(0, 2), /.*/, textLines), throws(instanceOf(Error)));
  });

  it('getWordRangeAtPosition should properly use regex', function () {
    const textLines = ['some text here', '/** foo bar */', 'function() {', '	"far boo"', '}'];
    let range = getWordRangeAtPosition(Position.create(0, 0), /\/\*.+\*\//, textLines);
    assertThat(range, undefined);

    range = getWordRangeAtPosition(Position.create(1, 0), /\/\*.+\*\//, textLines);
    assertThat(range, Range.create(1, 0, 1, 14));

    range = getWordRangeAtPosition(Position.create(3, 0), /("|').*\1/, textLines);
    strictEqual(range, undefined);

    range = getWordRangeAtPosition(Position.create(3, 1), /("|').*\1/, textLines);
    assertThat(range, Range.create(3, 1, 3, 10));
  });

  it('getWordRangeAtPosition should find word', function () {
    const regex = /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g;
    const line = 'int abcdefhijklmnopqwvrstxyz;';

    const range = getWordRangeAtPosition(Position.create(0, 27), regex, [line]);

    assertThat(range, Range.create(0, 4, 0, 28));
  });
});
