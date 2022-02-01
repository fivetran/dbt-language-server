import { strictEqual } from 'assert';
import { assertThat, instanceOf, throws } from 'hamjest';
import { Position, Range } from 'vscode-languageserver';
import { getWordRangeAtPosition } from '../../utils/TextUtils';

describe('TextUtils', () => {
  it('getWordRangeAtPosition should find words', () => {
    const textLines = ['aaaa bbbb+cccc abc'];
    let range: Range | undefined;

    range = getWordRangeAtPosition(Position.create(0, 5), /[a-z+]+/, textLines);
    assertThat(range?.start.line, 0);
    assertThat(range?.start.character, 5);
    assertThat(range?.end.line, 0);
    assertThat(range?.end.character, 14);

    range = getWordRangeAtPosition(Position.create(0, 17), /[a-z+]+/, textLines);
    assertThat(range?.start.line, 0);
    assertThat(range?.start.character, 15);
    assertThat(range?.end.line, 0);
    assertThat(range?.end.character, 18);

    range = getWordRangeAtPosition(Position.create(0, 11), /yy/, textLines);
    assertThat(range, undefined);
  });

  it('getWordRangeAtPosition should ignore bad regular expression', () => {
    const textLines = ['aaaa bbbb+cccc abc'];
    assertThat(() => getWordRangeAtPosition(Position.create(0, 2), /.*/, textLines), throws(instanceOf(Error)));
  });

  it("getWordRangeAtPosition doesn't quite use the regex as expected", function () {
    const textLines = ['some text here', '/** foo bar */', 'function() {', '	"far boo"', '}'];
    let range = getWordRangeAtPosition(Position.create(0, 0), /\/\*.+\*\//, textLines);
    assertThat(range, undefined);

    range = getWordRangeAtPosition(Position.create(1, 0), /\/\*.+\*\//, textLines);
    assertThat(range?.start.line, 1);
    assertThat(range?.start.character, 0);
    assertThat(range?.end.line, 1);
    assertThat(range?.end.character, 14);

    range = getWordRangeAtPosition(Position.create(3, 0), /("|').*\1/, textLines);
    strictEqual(range, undefined);

    range = getWordRangeAtPosition(Position.create(3, 1), /("|').*\1/, textLines);
    assertThat(range?.start.line, 3);
    assertThat(range?.start.character, 1);
    assertThat(range?.end.line, 3);
    assertThat(range?.end.character, 10);
  });

  //   it('getWordRangeAtPosition can freeze the extension host #95319', function () {
  //     const regex =
  //       /(https?:\/\/github\.com\/(([^\s]+)\/([^\s]+))\/([^\s]+\/)?(issues|pull)\/([0-9]+))|(([^\s]+)\/([^\s]+))?#([1-9][0-9]*)($|[\s\:\;\-\(\=])/;

  //     data = new ExtHostDocumentData(undefined!, URI.file(''), [perfData._$_$_expensive], '\n', 1, 'text', false);

  //     let range = data.document.getWordRangeAtPosition(new Position(0, 1_177_170), regex)!;
  //     assert.strictEqual(range, undefined);

  //     const pos = new Position(0, 1177170);
  //     range = data.document.getWordRangeAtPosition(pos)!;
  //     assert.ok(range);
  //     assert.ok(range.contains(pos));
  //     assert.strictEqual(data.document.getText(range), 'TaskDefinition');
  //   });

  it('Rename popup sometimes populates with text on the left side omitted #96013', function () {
    const regex = /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g;
    const line = 'int abcdefhijklmnopqwvrstxyz;';

    const range = getWordRangeAtPosition(Position.create(0, 27), regex, [line]);

    assertThat(range?.start.line, 0);
    assertThat(range?.end.line, 0);
    assertThat(range?.start.character, 4);
    assertThat(range?.end.character, 28);
  });
});
