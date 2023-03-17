import { assertThat, hasSize, instanceOf, startsWith } from 'hamjest';
import { Hover, MarkdownString, Position, commands } from 'vscode';
import { TEST_FIXTURE_PATH, activateAndWaitManifestParsed, executeSignatureHelpProvider, getDocUri, setTestContent } from './helper';

suite('Functions', () => {
  const DOC_URI = getDocUri('functions.sql');

  test('Should show help for date function', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Date(', false);

    const help = await executeSignatureHelpProvider(DOC_URI, new Position(0, 12), '(');

    // assert
    assertThat(help.signatures.length, 3);
    assertThat(help.signatures[0].label, 'DATE(year, month, day)');
    assertThat(help.signatures[0].documentation, instanceOf(MarkdownString));
    assertThat(
      (help.signatures[0].documentation as MarkdownString).value,
      'Constructs a DATE from INT64 values representing\nthe year, month, and day.',
    );
    assertThat(help.signatures[0].parameters, [
      { label: 'year', documentation: undefined },
      { label: 'month', documentation: undefined },
      { label: 'day', documentation: undefined },
    ]);
  });

  test('Should show signature on hover', async () => {
    // arrange
    await activateAndWaitManifestParsed(DOC_URI, TEST_FIXTURE_PATH);

    await setTestContent('select Coalesce', false);

    // act
    const hovers = await commands.executeCommand<Hover[]>('vscode.executeHoverProvider', DOC_URI, new Position(0, 8));

    // assert
    assertThat(hovers, hasSize(1));
    assertThat(hovers[0].contents, hasSize(1));
    assertThat((hovers[0].contents[0] as MarkdownString).value, startsWith('```sql\nCOALESCE(expr[, ...])\n```'));
  });
});
