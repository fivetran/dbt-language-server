import { assertThat } from 'hamjest';
import { commands, Position } from 'vscode';
import { createAndOpenTempModel, getCursorPosition, getMainEditorText, setTestContent, sleep } from './helper';

suite('Should do completion for snippets', () => {
  suiteSetup(async () => {
    await createAndOpenTempModel('test-fixture', 'preview');
  });

  test('Should move cursor into brackets after avg function completion', async () => {
    await shouldPasteTextAndMoveCursor('select Avg', 'select avg()', new Position(0, 11));
  });

  test('Should paste ref', async () => {
    await shouldPasteTextAndMoveCursor('ref', "{{ ref('') }}", new Position(0, 8));
  });

  suiteTeardown(async () => {
    await setTestContent('', false);
  });
});

async function shouldPasteTextAndMoveCursor(initialText: string, expectedText: string, expectedCursorPosition: Position): Promise<void> {
  // arrange
  await setTestContent(initialText, false);

  // act
  await commands.executeCommand('editor.action.triggerSuggest');
  await sleep(400);
  await commands.executeCommand('acceptSelectedSuggestion');
  await sleep(300);

  // assert
  assertThat(getMainEditorText(), expectedText);
  assertThat(getCursorPosition(), expectedCursorPosition);
}
