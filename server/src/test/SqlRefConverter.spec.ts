import assert = require('assert');
import { Range, uinteger } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JinjaParser } from '../JinjaParser';
import { ManifestModel } from '../ManifestJson';
import { Change, SqlRefConverter } from '../SqlRefConverter';
import { ResolvedTable } from '../ZetaSqlAst';

describe('SqlRefConverter', () => {
  const SQL_REF_CONVERTER = new SqlRefConverter(new JinjaParser());

  function shouldConvertRefToSql(rawDocumentString: string, dbtModels: ManifestModel[], expectedChanges: Change[]): void {
    // arrange
    const doc = TextDocument.create('test', 'sql', 0, rawDocumentString);

    // act
    const changes = SQL_REF_CONVERTER.refToSql(doc, dbtModels);

    // assert
    assert.strictEqual(changes.length, dbtModels.length);
    assert.deepStrictEqual(changes, expectedChanges);
  }

  function createManifestNodes(count: number): ManifestModel[] {
    return [...Array(count).keys()].map<ManifestModel>(n => ({
      name: `test_model${n}`,
      database: 'db',
      schema: 'schema',
      originalFilePath: `models/test_model${n}.sql`,
    }));
  }

  function createResolvedTable(index: number, start: number, end: number): ResolvedTable {
    return {
      schema: 'schema',
      name: `test_model${index}`,
      location: { start, end },
    };
  }

  function createChange(index: number, startLine: uinteger, startCharacter: uinteger, endLine: uinteger, endCharacter: uinteger): Change {
    return {
      range: Range.create(startLine, startCharacter, endLine, endCharacter),
      newText: `\`db\`.\`schema\`.\`test_model${index}\``,
    };
  }

  it('Should convert ref to sql', () => {
    const raw = "{{ ref('test_model0') }}";
    const compiled = '`db`.`schema`.`test_model0`';

    shouldConvertRefToSql(raw, createManifestNodes(1), [
      {
        range: Range.create(0, 0, 0, raw.length),
        newText: compiled,
      },
    ]);
  });

  it('Should convert several ref in one line to sql', () => {
    const raw = "{{ ref('test_model0') }}  {{ ref('test_model1') }}   {{ ref('test_model2') }}";
    // '`db`.`schema`.`test_model0`  `db`.`schema`.`test_model1`   `db`.`schema`.`test_model2`';
    shouldConvertRefToSql(raw, createManifestNodes(3), [createChange(0, 0, 0, 0, 24), createChange(1, 0, 26, 0, 50), createChange(2, 0, 53, 0, 77)]);
  });

  it('Should convert several ref in multiple lines to sql', () => {
    const raw = "{{ ref('test_model0') }}  \n{{ ref('test_model1') }}   \n\n{{ ref('test_model2') }}";
    // '`db`.`schema`.`test_model0`  \n`db`.`schema`.`test_model1`   \n\n`db`.`schema`.`test_model2`';
    shouldConvertRefToSql(raw, createManifestNodes(3), [createChange(0, 0, 0, 0, 24), createChange(1, 1, 0, 1, 24), createChange(2, 3, 0, 3, 24)]);
  });

  it('Should convert sql to ref', () => {
    const sql = 'select * from `db`.`schema`.`test_model0`';
    const doc = TextDocument.create('test', 'sql', 0, sql);

    const changes = SQL_REF_CONVERTER.sqlToRef(
      doc,
      [createResolvedTable(0, 14, 41)],
      [{ name: 'test_model0', database: 'db', schema: 'schema', originalFilePath: 'test.sql' }],
    );

    assert.strictEqual(changes.length, 1);
    assert.deepStrictEqual(changes, [
      {
        range: Range.create(0, 14, 0, 41),
        newText: "{{ ref('test_model0') }}",
      },
    ]);
  });

  it('Should convert multiple sql to ref', () => {
    const sql = 'select * from `db`.`schema`.`test_model1`\n\ninner join `db`.`schema`.`test_model2`';
    const doc = TextDocument.create('test', 'sql', 0, sql);

    const changes = SQL_REF_CONVERTER.sqlToRef(doc, [createResolvedTable(1, 14, 41), createResolvedTable(2, 54, 81)], createManifestNodes(3));

    assert.strictEqual(changes.length, 2);
    assert.deepStrictEqual(changes, [
      {
        range: Range.create(0, 14, 0, 41),
        newText: "{{ ref('test_model1') }}",
      },
      {
        range: Range.create(2, 11, 2, 38),
        newText: "{{ ref('test_model2') }}",
      },
    ]);
  });
});
