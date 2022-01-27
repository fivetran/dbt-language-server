import { assertThat, instanceOf, throws } from 'hamjest';
import { Position, Range } from 'vscode-languageserver';
import { getWordRangeAtPosition } from '../../utils/TextUtils';

describe('Utils', () => {
  it('getWordRangeAtPosition', () => {
    const lines = ['aaaa bbbb+cccc abc'];
    let range: Range;

    // ignore bad regular expresson /.*/
    assertThat(() => getWordRangeAtPosition(Position.create(0, 2), /.*/, lines)!, throws(instanceOf(Error)));

    range = getWordRangeAtPosition(Position.create(0, 5), /[a-z+]+/, lines)!;
    assertThat(range.start.line, 0);
    assertThat(range.start.character, 5);
    assertThat(range.end.line, 0);
    assertThat(range.end.character, 14);

    range = getWordRangeAtPosition(Position.create(0, 17), /[a-z+]+/, lines)!;
    assertThat(range.start.line, 0);
    assertThat(range.start.character, 15);
    assertThat(range.end.line, 0);
    assertThat(range.end.character, 18);

    range = getWordRangeAtPosition(Position.create(0, 11), /yy/, lines)!;
    assertThat(range, undefined);
  });

  //   it("getWordRangeAtPosition doesn't quite use the regex as expected, #29102", function () {
  //     data = new ExtHostDocumentData(
  //       undefined!,
  //       URI.file(''),
  //       ['some text here', '/** foo bar */', 'function() {', '	"far boo"', '}'],
  //       '\n',
  //       1,
  //       'text',
  //       false,
  //     );

  //     let range = data.document.getWordRangeAtPosition(new Position(0, 0), /\/\*.+\*\//);
  //     assert.strictEqual(range, undefined);

  //     range = data.document.getWordRangeAtPosition(new Position(1, 0), /\/\*.+\*\//)!;
  //     assert.strictEqual(range.start.line, 1);
  //     assert.strictEqual(range.start.character, 0);
  //     assert.strictEqual(range.end.line, 1);
  //     assert.strictEqual(range.end.character, 14);

  //     range = data.document.getWordRangeAtPosition(new Position(3, 0), /("|').*\1/);
  //     assert.strictEqual(range, undefined);

  //     range = data.document.getWordRangeAtPosition(new Position(3, 1), /("|').*\1/)!;
  //     assert.strictEqual(range.start.line, 3);
  //     assert.strictEqual(range.start.character, 1);
  //     assert.strictEqual(range.end.line, 3);
  //     assert.strictEqual(range.end.character, 10);
  //   });

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

  //   it('Rename popup sometimes populates with text on the left side omitted #96013', function () {
  //     const regex = /(-?\d*\.\d\w*)|([^\`\~\!\@\#\$\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g;
  //     const line = 'int abcdefhijklmnopqwvrstxyz;';

  //     data = new ExtHostDocumentData(undefined!, URI.file(''), [line], '\n', 1, 'text', false);

  //     let range = data.document.getWordRangeAtPosition(new Position(0, 27), regex)!;
  //     assert.strictEqual(range.start.line, 0);
  //     assert.strictEqual(range.end.line, 0);
  //     assert.strictEqual(range.start.character, 4);
  //     assert.strictEqual(range.end.character, 28);
  //   });

  //   it('Custom snippet $TM_SELECTED_TEXT not show suggestion #108892', function () {
  //     data = new ExtHostDocumentData(
  //       undefined!,
  //       URI.file(''),
  //       [
  //         `        <p><span xml:lang="en">Sheldon</span>, soprannominato "<span xml:lang="en">Shelly</span> dalla madre e dalla sorella, è nato a <span xml:lang="en">Galveston</span>, in <span xml:lang="en">Texas</span>, il 26 febbraio 1980 in un supermercato. È stato un bambino prodigio, come testimoniato dal suo quoziente d'intelligenza (187, di molto superiore alla norma) e dalla sua rapida carriera scolastica: si è diplomato all'eta di 11 anni approdando alla stessa età alla formazione universitaria e all'età di 16 anni ha ottenuto il suo primo dottorato di ricerca. All'inizio della serie e per gran parte di essa vive con il coinquilino Leonard nell'appartamento 4A al 2311 <span xml:lang="en">North Los Robles Avenue</span> di <span xml:lang="en">Pasadena</span>, per poi trasferirsi nell'appartamento di <span xml:lang="en">Penny</span> con <span xml:lang="en">Amy</span> nella decima stagione. Come più volte afferma lui stesso possiede una memoria eidetica e un orecchio assoluto. È stato educato da una madre estremamente religiosa e, in più occasioni, questo aspetto contrasta con il rigore scientifico di <span xml:lang="en">Sheldon</span>; tuttavia la donna sembra essere l'unica persona in grado di comandarlo a bacchetta.</p>`,
  //       ],
  //       '\n',
  //       1,
  //       'text',
  //       false,
  //     );

  //     const pos = new Position(0, 55);
  //     const range = data.document.getWordRangeAtPosition(pos)!;
  //     assert.strictEqual(range.start.line, 0);
  //     assert.strictEqual(range.end.line, 0);
  //     assert.strictEqual(range.start.character, 47);
  //     assert.strictEqual(range.end.character, 61);
  //     assert.strictEqual(data.document.getText(range), 'soprannominato');
  //   });
});
