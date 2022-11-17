import { assertThat } from 'hamjest';
import { Position } from 'vscode';
import { createAndOpenTempModel, getCursorPosition, getMainEditorText, setTestContent, triggerAndAcceptFirstSuggestion } from './helper';

suite('Should do completion for snippets', () => {
  suiteSetup(async () => {
    await createAndOpenTempModel('test-fixture', 'manifest');
  });

  test('Should move cursor into brackets after avg function completion', async () => {
    await shouldPasteTextAndMoveCursor('select Avg', 'select avg()', new Position(0, 11));
  });

  test('Should paste ref', async () => {
    await shouldPasteTextAndMoveCursor('ref', "{{ ref('') }}", new Position(0, 8));
  });

  test('Should paste config', async () => {
    await shouldPasteTextAndMoveCursor('conf', "{{\n  config(\n    schema=''\n    materialized='table'\n  )\n}}\n", new Position(2, 12));
  });

  suiteTeardown(async () => {
    await setTestContent('', false);
  });
});

async function shouldPasteTextAndMoveCursor(initialText: string, expectedText: string, expectedCursorPosition: Position): Promise<void> {
  // arrange
  await setTestContent(initialText, false);

  // act
  await triggerAndAcceptFirstSuggestion();

  // assert
  assertThat(getMainEditorText(), expectedText);
  assertThat(getCursorPosition(), expectedCursorPosition);
}
