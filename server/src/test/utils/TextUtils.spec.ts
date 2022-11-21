import { assertThat, instanceOf, throws } from 'hamjest';
import { Position, Range } from 'vscode-languageserver';
import { MacroDefinitionProvider } from '../../definition/MacroDefinitionProvider';
import { ModelDefinitionProvider } from '../../definition/ModelDefinitionProvider';
import { SourceDefinitionProvider } from '../../definition/SourceDefinitionProvider';
import { getSignatureInfo, getWordRangeAtPosition } from '../../utils/TextUtils';

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

  it('getWordRangeAtPosition should properly use regex', () => {
    const textLines = ['some text here', '/** foo bar */', 'function() {', '	"far boo"', '}'];
    assertWordRangeAtPosition(Position.create(0, 0), /\/\*.+\*\//, textLines, undefined);
    assertWordRangeAtPosition(Position.create(1, 0), /\/\*.+\*\//, textLines, Range.create(1, 0, 1, 14));
    assertWordRangeAtPosition(Position.create(3, 0), /("|').*\1/, textLines, undefined);
    assertWordRangeAtPosition(Position.create(3, 1), /("|').*\1/, textLines, Range.create(3, 1, 3, 10));
  });

  it('getWordRangeAtPosition should find word', () => {
    const regex = /(-?\d*\.\d\w*)|([^`~!@#$%^&*()\-=+[{\]}\\|;:'",.<>/?\s]+)/g;
    const line = 'int abcdefhijklmnopqwvrstxyz;';
    assertWordRangeAtPosition(Position.create(0, 27), regex, [line], Range.create(0, 4, 0, 28));
  });

  it('getWordRangeAtPosition should find ref expressions', () => {
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

  it('getWordRangeAtPosition should find macro expressions', () => {
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

  it('getWordRangeAtPosition should find source expressions', () => {
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

  it('getSignatureInfo should return undefined if no range found', () => {
    getSignatureInfoShouldReturnRange('a()', Position.create(0, 0), undefined, 0);
    getSignatureInfoShouldReturnRange('a()', Position.create(0, 1), undefined, 0);
    getSignatureInfoShouldReturnRange('a()', Position.create(0, 3), undefined, 0);
    getSignatureInfoShouldReturnRange('a(b)', Position.create(0, 4), undefined, 0);
    getSignatureInfoShouldReturnRange('a)(', Position.create(0, 1), undefined, 0);
    getSignatureInfoShouldReturnRange('a)(', Position.create(0, 2), undefined, 0);
    getSignatureInfoShouldReturnRange('KLL_QUANTILES.EXTRACT_POINT_INT64(sketch, phi)', Position.create(0, 46), undefined, 0);
  });

  it('getSignatureInfo should return range', () => {
    getSignatureInfoShouldReturnRange('a()', Position.create(0, 2), Range.create(0, 0, 0, 1), 0);
    getSignatureInfoShouldReturnRange('  a()', Position.create(0, 4), Range.create(0, 2, 0, 3), 0);
    getSignatureInfoShouldReturnRange('a(b)', Position.create(0, 3), Range.create(0, 0, 0, 1), 0);
    getSignatureInfoShouldReturnRange('a(b())', Position.create(0, 3), Range.create(0, 0, 0, 1), 0);
    getSignatureInfoShouldReturnRange('a(b())', Position.create(0, 5), Range.create(0, 0, 0, 1), 0);
    getSignatureInfoShouldReturnRange('a(  b())', Position.create(0, 5), Range.create(0, 0, 0, 1), 0);
    getSignatureInfoShouldReturnRange('a(b())', Position.create(0, 4), Range.create(0, 2, 0, 3), 0);
    getSignatureInfoShouldReturnRange('a(b(c()))', Position.create(0, 6), Range.create(0, 4, 0, 5), 0);
    getSignatureInfoShouldReturnRange(' coalesce(max())', Position.create(0, 13), Range.create(0, 1, 0, 9), 0);
    getSignatureInfoShouldReturnRange(' coalesce(min())', Position.create(0, 14), Range.create(0, 10, 0, 13), 0);
  });

  it('getSignatureInfo should return range for multiline text', () => {
    getSignatureInfoShouldReturnRange('a()', Position.create(2, 2), Range.create(2, 0, 2, 1), 0);
    getSignatureInfoShouldReturnRange(' coalesce(max())', Position.create(2, 13), Range.create(2, 1, 2, 9), 0);
  });

  it('getSignatureInfo should return correct parameter index for only one function', () => {
    getSignatureInfoShouldReturnRange('a(,)', Position.create(0, 2), Range.create(0, 0, 0, 1), 0);
    getSignatureInfoShouldReturnRange('a(,)', Position.create(0, 3), Range.create(0, 0, 0, 1), 1);
    getSignatureInfoShouldReturnRange('a(,,)', Position.create(0, 3), Range.create(0, 0, 0, 1), 1);
    getSignatureInfoShouldReturnRange('a(,,)', Position.create(0, 4), Range.create(0, 0, 0, 1), 2);
    getSignatureInfoShouldReturnRange('a(,   ,)', Position.create(0, 4), Range.create(0, 0, 0, 1), 1);
    getSignatureInfoShouldReturnRange('a(    ,   ,)', Position.create(0, 4), Range.create(0, 0, 0, 1), 0);
  });

  it('getSignatureInfo should return correct parameter index for nested functions', () => {
    getSignatureInfoShouldReturnRange('a(b(,))', Position.create(0, 4), Range.create(0, 2, 0, 3), 0);
    getSignatureInfoShouldReturnRange('a(b(,))', Position.create(0, 5), Range.create(0, 2, 0, 3), 1);
    getSignatureInfoShouldReturnRange('a( b(,))', Position.create(0, 5), Range.create(0, 3, 0, 4), 0);
    getSignatureInfoShouldReturnRange('a(b(,))', Position.create(0, 5), Range.create(0, 2, 0, 3), 1);
    getSignatureInfoShouldReturnRange('a(b(,,))', Position.create(0, 6), Range.create(0, 2, 0, 3), 2);
    getSignatureInfoShouldReturnRange('a(b(,,,))', Position.create(0, 7), Range.create(0, 2, 0, 3), 3);
  });

  it('getSignatureInfo should work for two words functions', () => {
    getSignatureInfoShouldReturnRange('hll_count.init()', Position.create(0, 15), Range.create(0, 0, 0, 14), 0);
    getSignatureInfoShouldReturnRange('KLL_QUANTILES.EXTRACT_POINT_INT64(sketch, phi)', Position.create(0, 45), Range.create(0, 0, 0, 33), 1);
  });
});

function getSignatureInfoShouldReturnRange(text: string, position: Position, expectedRange?: Range, expectedParameterIndex?: number): void {
  // act
  const signatureInfo = getSignatureInfo(text, position);

  // assert
  assertThat(signatureInfo, expectedRange ? { range: expectedRange, parameterIndex: expectedParameterIndex } : undefined);
}

function assertWordRangeAtPosition(position: Position, regex: RegExp, textLines: string[], wordRange: Range | undefined): void {
  const range = getWordRangeAtPosition(position, regex, textLines);
  assertThat(range, wordRange);
}
