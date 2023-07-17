import { CompletionItemKind, Position } from 'vscode';
import { assertCompletions } from './asserts';
import { SNOWFLAKE_PATH, activateAndWait, getCustomDocUri, replaceText } from './helper';

test('Should suggest columns with correct types after press .', async () => {
  const docUri = getCustomDocUri(`${SNOWFLAKE_PATH}/models/snowflake_types.sql`);
  await activateAndWait(docUri);
  await replaceText('*', 't.');

  await assertCompletions(
    docUri,
    new Position(0, 9),
    [
      { label: 'ARRAY_VAL', detail: 'all_types ARRAY', kind: CompletionItemKind.Value },
      { label: 'BINARY_VAL', detail: 'all_types BYTES', kind: CompletionItemKind.Value },
      { label: 'BOOLEAN_VAL', detail: 'all_types BOOL', kind: CompletionItemKind.Value },
      { label: 'DATE_VAL', detail: 'all_types DATE', kind: CompletionItemKind.Value },
      { label: 'DATETIME_VAL', detail: 'all_types TIMESTAMP', kind: CompletionItemKind.Value },
      { label: 'FLOAT_VAL', detail: 'all_types FLOAT', kind: CompletionItemKind.Value },
      { label: 'GEOGRAPHY_VAL', detail: 'all_types GEOGRAPHY', kind: CompletionItemKind.Value },
      { label: 'INTEGER_VAL', detail: 'all_types NUMERIC', kind: CompletionItemKind.Value },
      { label: 'NUMBER_VAL', detail: 'all_types NUMERIC', kind: CompletionItemKind.Value },
      { label: 'OBJECT_VAL', detail: 'all_types OBJECT', kind: CompletionItemKind.Value },
      { label: 'TEXT_VAL', detail: 'all_types STRING', kind: CompletionItemKind.Value },
      { label: 'TIME_VAL', detail: 'all_types TIME', kind: CompletionItemKind.Value },
      { label: 'VARIANT_VAL', detail: 'all_types VARIANT', kind: CompletionItemKind.Value },
    ],
    '.',
  );
});
