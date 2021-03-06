import { assertThat } from 'hamjest';
import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ManifestModel } from '../manifest/ManifestJson';
import { SqlRefConverter } from '../SqlRefConverter';
import { ResolvedTable } from '../ZetaSqlAst';

describe('SqlRefConverter', () => {
  const SQL_REF_CONVERTER = new SqlRefConverter();

  function createManifestNodes(count: number): ManifestModel[] {
    return [...Array(count).keys()].map<ManifestModel>(n => ({
      uniqueId: `model.package.test_model${n}`,
      rootPath: '/Users/test/dbt_project',
      originalFilePath: `models/test_model${n}.sql`,
      name: `test_model${n}`,
      database: 'db',
      schema: 'schema',
      packageName: 'test_package',
      dependsOn: {
        nodes: [],
      },
      refs: [],
    }));
  }

  function createResolvedTable(index: number, start: number, end: number): ResolvedTable {
    return {
      schema: 'schema',
      name: `test_model${index}`,
      location: { start, end },
    };
  }

  it('Should convert sql to ref', () => {
    const sql = 'select * from `db`.`schema`.`test_model0`';
    const doc = TextDocument.create('test', 'sql', 0, sql);

    const changes = SQL_REF_CONVERTER.sqlToRef(
      doc,
      [createResolvedTable(0, 14, 41)],
      [
        {
          uniqueId: `model.package.test_model0`,
          rootPath: '/Users/test/dbt_project',
          originalFilePath: 'test_model0.sql',
          name: 'test_model0',
          database: 'db',
          schema: 'schema',
          packageName: 'test_package',
          dependsOn: {
            nodes: [],
          },
          refs: [],
        },
      ],
    );

    assertThat(changes.length, 1);
    assertThat(changes, [
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

    assertThat(changes.length, 2);
    assertThat(changes, [
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
