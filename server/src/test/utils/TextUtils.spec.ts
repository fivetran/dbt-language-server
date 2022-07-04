import { assertThat, instanceOf, throws } from 'hamjest';
import { Position, Range } from 'vscode-languageserver';
import { MacroDefinitionProvider } from '../../definition/MacroDefinitionProvider';
import { ModelDefinitionProvider } from '../../definition/ModelDefinitionProvider';
import { SourceDefinitionProvider } from '../../definition/SourceDefinitionProvider';
import { getTextRangeBeforeBracket, getWordRangeAtPosition } from '../../utils/TextUtils';

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

  it('getWordRangeAtPosition should find ref expressions', function () {
    assertWordRangeAtPosition(
      Position.create(0, 8),
      ModelDefinitionProvider.REF_PATTERN,
      ["{{ ref('my_new_project', 'table_exists') }}"],
      Range.create(0, 3, 0, 40),
    );
    assertWordRangeAtPosition(
      Position.create(0, 14),
      ModelDefinitionProvider.REF_PATTERN,
      ["{{  ref (  'my_new_project'  ,   'table_exists' )  }}"],
      Range.create(0, 4, 0, 49),
    );
  });

  it('getWordRangeAtPosition should find macro expressions', function () {
    assertWordRangeAtPosition(
      Position.create(0, 21),
      MacroDefinitionProvider.MACRO_PATTERN,
      ["{{ extract_first_name('u.name') }}"],
      Range.create(0, 3, 0, 22),
    );
    assertWordRangeAtPosition(
      Position.create(0, 21),
      MacroDefinitionProvider.MACRO_PATTERN,
      ["{{ extract_first_name  ('u.name') }}"],
      Range.create(0, 3, 0, 24),
    );
  });

  it('getWordRangeAtPosition should find source expressions', function () {
    assertWordRangeAtPosition(
      Position.create(0, 11),
      SourceDefinitionProvider.SOURCE_PATTERN,
      ["{{ source('new_project', 'users') }}"],
      Range.create(0, 3, 0, 33),
    );
    assertWordRangeAtPosition(
      Position.create(0, 36),
      SourceDefinitionProvider.SOURCE_PATTERN,
      ["{{  source ( 'new_project' ,  'users' )  }}"],
      Range.create(0, 4, 0, 39),
    );
  });

  it('getTextRangeBeforeBracket should return cursor position if no range found', function () {
    getTextRangeBeforeBracket_shouldReturnRange('a()', Position.create(0, 0), Range.create(0, 0, 0, 0));
    getTextRangeBeforeBracket_shouldReturnRange('a()', Position.create(0, 1), Range.create(0, 1, 0, 1));
    getTextRangeBeforeBracket_shouldReturnRange('a()', Position.create(0, 3), Range.create(0, 3, 0, 3));
    getTextRangeBeforeBracket_shouldReturnRange('a(b)', Position.create(0, 4), Range.create(0, 4, 0, 4));
    getTextRangeBeforeBracket_shouldReturnRange('a)(', Position.create(0, 1), Range.create(0, 1, 0, 1));
    getTextRangeBeforeBracket_shouldReturnRange('a)(', Position.create(0, 2), Range.create(0, 2, 0, 2));
  });

  it('getTextRangeBeforeBracket should return range', function () {
    getTextRangeBeforeBracket_shouldReturnRange('a()', Position.create(0, 2), Range.create(0, 0, 0, 1));
    getTextRangeBeforeBracket_shouldReturnRange('  a()', Position.create(0, 4), Range.create(0, 2, 0, 3));
    getTextRangeBeforeBracket_shouldReturnRange('a(b)', Position.create(0, 3), Range.create(0, 0, 0, 1));
    getTextRangeBeforeBracket_shouldReturnRange('a(b())', Position.create(0, 3), Range.create(0, 0, 0, 1));
    getTextRangeBeforeBracket_shouldReturnRange('a(b())', Position.create(0, 5), Range.create(0, 0, 0, 1));
    getTextRangeBeforeBracket_shouldReturnRange('a(  b())', Position.create(0, 5), Range.create(0, 0, 0, 1));
    getTextRangeBeforeBracket_shouldReturnRange('a(b())', Position.create(0, 4), Range.create(0, 2, 0, 3));
    getTextRangeBeforeBracket_shouldReturnRange('a(b(c()))', Position.create(0, 6), Range.create(0, 4, 0, 5));
    getTextRangeBeforeBracket_shouldReturnRange(' coalesce(max())', Position.create(0, 13), Range.create(0, 1, 0, 9));
    getTextRangeBeforeBracket_shouldReturnRange(' coalesce(min())', Position.create(0, 14), Range.create(0, 10, 0, 13));
  });

  it('getTextRangeBeforeBracket should return range for multiline text', function () {
    getTextRangeBeforeBracket_shouldReturnRange('\n\na()', Position.create(2, 2), Range.create(2, 0, 2, 1));
    getTextRangeBeforeBracket_shouldReturnRange('\n\n coalesce(max())', Position.create(2, 13), Range.create(2, 1, 2, 9));
  });

  function getTextRangeBeforeBracket_shouldReturnRange(text: string, position: Position, expectedRange: Range): void {
    // act
    const range = getTextRangeBeforeBracket(text, position);

    // assert
    assertThat(range, expectedRange);
  }

  function assertWordRangeAtPosition(position: Position, regex: RegExp, textLines: string[], wordRange: Range | undefined): void {
    const range = getWordRangeAtPosition(position, regex, textLines);
    assertThat(range, wordRange);
  }
});
