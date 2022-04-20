import assert = require('assert');
import { assertThat, greaterThanOrEqualTo, hasSize } from 'hamjest';
import { CompletionItem, DefinitionLink, Diagnostic, DiagnosticRelatedInformation, languages, Location, Position, Range, Uri } from 'vscode';
import { PREVIEW_URI, sleep, triggerCompletion, triggerDefinition } from './helper';

export async function assertDiagnostics(uri: Uri, diagnostics: Diagnostic[]): Promise<void> {
  await sleep(100);

  const rawDocDiagnostics = languages.getDiagnostics(uri);
  const previewDiagnostics = languages.getDiagnostics(Uri.parse(PREVIEW_URI));

  assertThat(rawDocDiagnostics, hasSize(diagnostics.length));
  assertThat(previewDiagnostics, hasSize(diagnostics.length));

  if (diagnostics.length > 0) {
    assertDiagnostic(rawDocDiagnostics[0], diagnostics[0]);
    assertDiagnostic(previewDiagnostics[0], diagnostics[0]);
  }
}

export function assertRange(actualRange: Range, expectedRange: Range): void {
  assertThat(actualRange.start.line, expectedRange.start.line);
  assertThat(actualRange.start.character, expectedRange.start.character);
  assertThat(actualRange.end.line, expectedRange.end.line);
  assertThat(actualRange.end.character, expectedRange.end.character);
}

function assertDiagnostic(actual: Diagnostic, expected: Diagnostic): void {
  assertThat(actual.message, expected.message);
  assertRange(actual.range, expected.range);

  if (expected.relatedInformation && expected.relatedInformation.length > 0) {
    assert.ok(actual.relatedInformation);
    assertRelatedInformation(actual.relatedInformation[0], expected.relatedInformation[0]);
  }
}

function assertRelatedInformation(actual: DiagnosticRelatedInformation, expected: DiagnosticRelatedInformation): void {
  assertThat(actual.message, expected.message);
  assertLocation(actual.location, expected.location);
}

function assertLocation(actual: Location, expected: Location): void {
  assertRange(actual.range, expected.range);
  assertThat(actual.uri.path, expected.uri.path);
}

export async function assertDefinitions(docUri: Uri, position: Position, expectedDefinitions: DefinitionLink[]): Promise<void> {
  const definitions = await triggerDefinition(docUri, position);

  assertThat(definitions.length, expectedDefinitions.length);

  for (let i = 0; i < definitions.length; i++) {
    assertThat(definitions[i].originSelectionRange, expectedDefinitions[i].originSelectionRange);
    assertThat(definitions[i].targetUri.path, expectedDefinitions[i].targetUri.path);
    assertThat(definitions[i].targetRange, expectedDefinitions[i].targetRange);
    assertThat(definitions[i].targetSelectionRange, expectedDefinitions[i].targetSelectionRange);
  }
}

export async function assertCompletions(
  docUri: Uri,
  position: Position,
  expectedCompletionList: CompletionItem[],
  triggerChar?: string,
): Promise<void> {
  const actualCompletionList = await triggerCompletion(docUri, position, triggerChar);

  assertThat(actualCompletionList.items.length, greaterThanOrEqualTo(expectedCompletionList.length));
  expectedCompletionList.forEach((expectedItem, i) => {
    const actualItem = actualCompletionList.items[i];
    assertThat(actualItem.label, expectedItem.label);
    assertThat(actualItem.kind, expectedItem.kind);
    assertThat(actualItem.insertText, expectedItem.insertText ?? expectedItem.label);
  });
}
