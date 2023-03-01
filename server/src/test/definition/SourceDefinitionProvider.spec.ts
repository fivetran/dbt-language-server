import { assertThat } from 'hamjest';
import * as fs from 'node:fs';
import { Range } from 'vscode-languageserver';
import { DbtRepository } from '../../DbtRepository';
import { SourceDefinitionProvider } from '../../definition/SourceDefinitionProvider';

describe('SourceDefinitionProvider', () => {
  const SOURCE_FILE_NAME = 'users_orders.yml';

  const DBT_REPOSITORY = new DbtRepository('project_path', Promise.resolve(undefined));
  const PROVIDER = new SourceDefinitionProvider(DBT_REPOSITORY);

  let sourceDefinitionLines: string[];

  before(() => {
    const sourceDefinitionFileContent = fs.readFileSync(`./server/src/test/yml_files/${SOURCE_FILE_NAME}`, 'utf8');
    sourceDefinitionLines = sourceDefinitionFileContent.split('\n');
  });

  it('getSourceRange should return correct range', () => {
    assertThat(PROVIDER.getSourceRange(sourceDefinitionLines, 'orders'), Range.create(7, 14, 7, 20));
    assertThat(PROVIDER.getSourceRange(sourceDefinitionLines, 'users'), Range.create(20, 14, 20, 19));
  });
});
