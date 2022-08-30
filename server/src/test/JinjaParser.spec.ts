import { assertThat } from 'hamjest';
import * as fs from 'node:fs';
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JinjaParser, Ref } from '../JinjaParser';

describe('JinjaParser', () => {
  const JINJA_PARSER = new JinjaParser();

  it('findAllJinjaRanges_shouldFindAllJinjaRanges', () => {
    shouldFindAllJinjaRanges('simple_query', []);
    shouldFindAllJinjaRanges('without_expressions', []);
    shouldFindAllJinjaRanges('one_at_the_beginning', [Range.create(0, 0, 7, 2)]);
    shouldFindAllJinjaRanges('one_at_the_end', [Range.create(8, 0, 8, 27)]);
    shouldFindAllJinjaRanges('four', [
      Range.create(0, 0, 0, 54),
      Range.create(1, 5, 1, 22),
      Range.create(1, 43, 1, 58),
      Range.create(2, 0, 2, 14),
      Range.create(0, 0, 2, 14),
    ]);
    shouldFindAllJinjaRanges('five', [
      Range.create(0, 0, 0, 73),
      Range.create(4, 4, 4, 47),
      Range.create(5, 36, 5, 54),
      Range.create(5, 76, 5, 94),
      Range.create(6, 4, 6, 16),
      Range.create(4, 4, 6, 16),
    ]);
  });

  it('Should fail with extra open jinja blocks', () => {
    shouldFail('extra_if');
  });

  it('Should fail with extra close jinja blocks', () => {
    shouldFail('extra_endif');
  });

  it('findAllRefs should find no refs for empty string', () => {
    shouldFindAllRefs('', []);
  });

  it('findAllRefs should find no refs for string without refs', () => {
    shouldFindAllRefs('nothing', []);
  });

  it('findAllRefs should find no refs for incomplete ref', () => {
    shouldFindAllRefs('{{ref("m")}', []);
  });

  it('findAllRefs should find one ref', () => {
    shouldFindAllRefs('{{ref("m")}}', [{ modelName: 'm', range: Range.create(0, 0, 0, 12) }]);
  });

  it('findAllRefs should find one ref for jinja with spaces', () => {
    shouldFindAllRefs('{{ ref("m") }}', [{ modelName: 'm', range: Range.create(0, 0, 0, 14) }]);
  });

  it('findAllRefs should find two refs for two jinjas', () => {
    shouldFindAllRefs('{{ref("m1")}}{{ref("m2")}}', [
      { modelName: 'm1', range: Range.create(0, 0, 0, 13) },
      { modelName: 'm2', range: Range.create(0, 13, 0, 26) },
    ]);
  });

  it('findAllRefs should find one ref for jinja with spaces after ref', () => {
    shouldFindAllRefs("{{ref   ('m')}}", [{ modelName: 'm', range: Range.create(0, 0, 0, 15) }]);
  });

  it('findAllRefs should find one ref for jinja with space after and before bracket', () => {
    shouldFindAllRefs("{{ref( 'm'  )}}", [{ modelName: 'm', range: Range.create(0, 0, 0, 15) }]);
  });
  it('findAllRefs should find one ref for jinja with space everywhere', () => {
    shouldFindAllRefs("{{   ref  (  'm'  )  }}  ", [{ modelName: 'm', range: Range.create(0, 0, 0, 23) }]);
  });

  it('findAllRefs should find one ref for jinja with new lines', () => {
    shouldFindAllRefs(
      `{{
       ref
       (
       'm'
       )
       }}`,
      [{ modelName: 'm', range: Range.create(0, 0, 5, 9) }],
    );
  });

  it('findAllRefs should not find ref with different quotes', () => {
    shouldFindAllRefs('{{ref(\'m")}}', []);
  });

  it('findAllRefs should not find ref with space between curly braces', () => {
    shouldFindAllRefs("{ {ref('m')}}", []);
  });

  function shouldFindAllJinjaRanges(fileName: string, ranges: Range[]): void {
    const result = findAllJinjaRangesInFile(fileName);

    assertThat(result?.length, ranges.length);
    assertThat(result, ranges);
  }

  function shouldFindAllRefs(rawDocumentString: string, expectedRefs: Ref[]): void {
    // arrange
    const doc = TextDocument.create('test', 'sql', 0, rawDocumentString);

    // act
    const refs = JINJA_PARSER.findAllRefs(doc);

    // assert
    assertThat(refs.length, expectedRefs.length);
    assertThat(refs, expectedRefs);
  }

  function shouldFail(fileName: string): void {
    const result = findAllJinjaRangesInFile(fileName);
    assertThat(result, undefined);
  }

  function findAllJinjaRangesInFile(fileName: string): Range[] | undefined {
    const doc = TextDocument.create('uri', 'id', 1, fs.readFileSync(`./server/src/test/sql_files/${fileName}.sql`, 'utf8'));
    return JINJA_PARSER.findAllJinjaRanges(doc);
  }
});
