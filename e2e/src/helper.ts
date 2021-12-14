import * as assert from 'assert';
import { spawnSync } from 'child_process';
import * as path from 'path';
import * as vscode from 'vscode';
import { TextDocumentChangeEvent, TextEditorEdit } from 'vscode';
import { readFileSync } from 'fs';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;

const MANIFEST_FILE_NAME = 'manifest.json';
const RESOURCE_TYPE_MODEL = 'model';

export const TEST_FIXTURE_PATH = path.resolve(__dirname, '../test-fixture');
vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument);
let promiseResolve: () => void;

export async function activateAndWait(docUri: vscode.Uri): Promise<void> {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension('Fivetran.dbt-language-server');
  if (!ext) {
    throw new Error('Fivetran.dbt-language-server not found');
  }

  const existingEditor = vscode.window.visibleTextEditors.find(e => e.document.uri.path === docUri.path);
  const doNotWaitChanges = existingEditor && existingEditor.document.getText() === vscode.window.activeTextEditor?.document.getText();
  const activateFinished = doNotWaitChanges ? Promise.resolve() : createPromise();

  await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    await showPreview();
    await activateFinished;
  } catch (e) {
    console.error(e);
  }
}

function onDidChangeTextDocument(e: TextDocumentChangeEvent): void {
  if (e.document.uri.path === 'Preview') {
    if (e.contentChanges.length === 1 && e.contentChanges[0].text === '') {
      return;
    }
    promiseResolve();
  }
}

export async function showPreview(): Promise<void> {
  await vscode.commands.executeCommand('editor.showQueryPreview');
}

export async function closeAllEditors(): Promise<void> {
  await vscode.commands.executeCommand('workbench.action.closeAllEditors');
}

export async function getPreviewText(): Promise<string> {
  const previewEditor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === 'query-preview:Preview?dbt-language-server');
  if (!previewEditor) {
    throw new Error('Preview editor not found');
  }

  return previewEditor.document.getText();
}

export function sleep(ms: number): Promise<unknown> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const getDocPath = (p: string): string => {
  return path.resolve(TEST_FIXTURE_PATH, 'models', p);
};

export const getDocUri = (p: string): vscode.Uri => {
  return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<void> {
  if (doc.getText() === content) {
    return;
  }
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  await edit(eb => eb.replace(all, content));
  const lastPos = doc.positionAt(doc.getText().length);
  editor.selection = new vscode.Selection(lastPos, lastPos);
}

export async function insertText(position: vscode.Position, value: string): Promise<void> {
  return edit(eb => eb.insert(position, value));
}

export async function replaceText(oldText: string, newText: string): Promise<void> {
  const offsetStart = editor.document.getText().indexOf(oldText);
  if (offsetStart === -1) {
    throw new Error(`text "${oldText}"" not found in "${editor.document.getText()}"`);
  }

  const positionStart = editor.document.positionAt(offsetStart);
  const positionEnd = editor.document.positionAt(offsetStart + oldText.length);

  return edit(eb => eb.replace(new vscode.Range(positionStart, positionEnd), newText));
}

async function edit(callback: (editBuilder: TextEditorEdit) => void): Promise<void> {
  const editFinished = createPromise();
  await editor.edit(callback);
  await editFinished;
}

function createPromise(): Promise<void> {
  return new Promise<void>(resolve => {
    promiseResolve = resolve;
  });
}

export function getCursorPosition(): vscode.Position {
  return editor.selection.end;
}

export function installExtension(extensionId: string): void {
  runCliCommand([`--install-extension=${extensionId}`]);
}

export function uninstallExtension(extensionId: string): void {
  runCliCommand([`--uninstall-extension=${extensionId}`]);
}

function runCliCommand(args: string[]): void {
  const cliPath = process.env['CLI_PATH'];
  if (!cliPath) {
    throw new Error('CLI_PATH environment variable not foud');
  }

  spawnSync(cliPath, args, {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}

export async function testCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  expectedCompletionList: vscode.CompletionList,
  triggerChar?: string,
): Promise<void> {
  const actualCompletionList = await triggerCompletion(docUri, position, triggerChar);

  assert.ok(actualCompletionList.items.length >= expectedCompletionList.items.length);
  expectedCompletionList.items.forEach((expectedItem, i) => {
    const actualItem = actualCompletionList.items[i];
    assert.strictEqual(actualItem.label, expectedItem.label);
    assert.strictEqual(actualItem.kind, expectedItem.kind);
  });
}

export async function triggerCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  triggerChar?: string,
): Promise<vscode.CompletionList<vscode.CompletionItem>> {
  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  return (await vscode.commands.executeCommand('vscode.executeCompletionItemProvider', docUri, position, triggerChar)) as vscode.CompletionList;
}

export function getManifestModels(): string[] {
  const manifestLocation = path.join(TEST_FIXTURE_PATH, 'target', MANIFEST_FILE_NAME);
  try {
    const content = readFileSync(manifestLocation, 'utf8');
    const manifest = JSON.parse(content);
    const nodes = manifest.nodes;

    if (nodes) {
      return Object.values(<any[]>nodes)
        .filter(n => n.resource_type === RESOURCE_TYPE_MODEL)
        .map(n => n.name)
        .sort();
    }
  } catch (e) {
    console.log(`Failed to read ${MANIFEST_FILE_NAME}`, e);
  }
  return [];
}
