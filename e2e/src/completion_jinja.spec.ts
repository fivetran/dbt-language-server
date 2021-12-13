import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { CompletionItem } from 'vscode';
import {
  getDbtVersion,
  activateAndWait,
  getDocPath,
  getDocUri,
  setTestContent,
  testCompletion,
  TEST_FIXTURE_PATH,
  triggerCompletion,
} from './helper';

suite('Should do completion inside jinjas expression', () => {
  let dbtVersion: string;
  let completionJinjaContent: string;

  suiteSetup(function () {
    dbtVersion = getDbtVersion();

    fs.copyFile(path.resolve(TEST_FIXTURE_PATH, 'target/test_manifest.json'), path.resolve(TEST_FIXTURE_PATH, 'target/manifest.json'), e => {
      if (e) {
        throw e;
      }
      console.log('File was copied to destination');
    });

    completionJinjaContent = fs.readFileSync(getDocPath('completion_jinja.sql')).toString();
  });

  suiteTeardown(function () {
    fs.unlink(path.resolve(TEST_FIXTURE_PATH, 'target/manifest.json'), e => {
      if (e) {
        throw e;
      }
      console.log('File manifest.json was deleted');
    });
    fs.writeFileSync(getDocPath('completion_jinja.sql'), completionJinjaContent);
  });

  test('Should suggest models for ref function by pressing "("', async () => {
    const docUri = getDocUri('completion_jinja.sql');
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');

    await testCompletion(docUri, new vscode.Position(0, 21), getCompletionList(true), '(');
  });

  test('Should suggest models for ref function', async () => {
    const docUri = getDocUri('completion_jinja.sql');
    await activateAndWait(docUri);
    await setTestContent('select * from {{ref(');

    await testCompletion(docUri, new vscode.Position(0, 20), getCompletionList(true));
  });

  test('Should suggest models for ref function by pressing "\'"', async () => {
    const docUri = getDocUri('completion_jinja.sql');
    await activateAndWait(docUri);
    await setTestContent(`select * from {{ref('`);

    await testCompletion(docUri, new vscode.Position(0, 21), getCompletionList(false), "'");
  });

  test('Should not suggest models outside jinja', async () => {
    // arrange
    const docUri = getDocUri('completion_jinja.sql');
    await activateAndWait(docUri);
    await setTestContent(`select * from {{}}ref('`);

    // act
    const actualCompletionList = await triggerCompletion(docUri, new vscode.Position(0, 22));

    // assert
    const actualLabels = actualCompletionList.items.map(i => <string>i.label);

    getCompletionList(false).items.forEach(i => assert.ok(!actualLabels.includes(<string>i.label)));
    getCompletionList(true).items.forEach(i => assert.ok(!actualLabels.includes(<string>i.label)));
  });

  function getCompletionList(withQuotes: boolean): { items: vscode.CompletionItem[] } {
    return { items: getLabels().map(l => <CompletionItem>{ label: withQuotes ? `'${l}'` : l, kind: vscode.CompletionItemKind.Value }) };
  }

  function getLabels(): string[] {
    return dbtVersion == '0.19.1'
      ? ['dbt_compile', 'errors', 'functions', 'jinja_sql', 'join_tables']
      : ['completion_jinja', 'dbt_compile', 'errors', 'functions', 'jinja_sql', 'join_tables'];
  }
});
