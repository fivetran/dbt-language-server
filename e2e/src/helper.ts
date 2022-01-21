import { spawnSync } from 'child_process';
import { assertThat, greaterThanOrEqualTo } from 'hamjest';
import * as path from 'path';
import * as vscode from 'vscode';
import { TextDocumentChangeEvent, TextEditorEdit } from 'vscode';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;

type voidFunc = () => void;

const PROJECTS_PATH = path.resolve(__dirname, '../projects');
const TEST_FIXTURE_PATH = path.resolve(PROJECTS_PATH, 'test-fixture');

vscode.workspace.onDidChangeTextDocument(onDidChangeTextDocument);

let previewPromiseResolve: voidFunc | undefined;
let documentPromiseResolve: voidFunc | undefined;

export async function activateAndWait(docUri: vscode.Uri): Promise<void> {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension('Fivetran.dbt-language-server');
  if (!ext) {
    throw new Error('Fivetran.dbt-language-server not found');
  }

  const existingEditor = vscode.window.visibleTextEditors.find(e => e.document.uri.path === docUri.path);
  const doNotWaitChanges =
    existingEditor && existingEditor.document.getText() === vscode.window.activeTextEditor?.document.getText() && getPreviewEditor();
  const activateFinished = doNotWaitChanges ? Promise.resolve() : createChangePromise('preview');

  await ext.activate();
  doc = await vscode.workspace.openTextDocument(docUri);
  editor = await vscode.window.showTextDocument(doc);
  await showPreview();
  await activateFinished;
}

function onDidChangeTextDocument(e: TextDocumentChangeEvent): void {
  if (e.contentChanges.length === 1 && e.contentChanges[0].text === '') {
    return;
  }

  if (e.document.uri.path === 'Preview' && previewPromiseResolve) {
    previewPromiseResolve();
  } else if (e.document === doc && documentPromiseResolve) {
    documentPromiseResolve();
  }
}

export async function waitDocumentModification(func: () => any): Promise<void> {
  const promise = createChangePromise('document');
  await func();
  await promise;
}

export function getMainEditorText(): string {
  return doc.getText();
}

export async function showPreview(): Promise<void> {
  await vscode.commands.executeCommand('editor.showQueryPreview');
}

export async function getPreviewText(): Promise<string> {
  const previewEditor = getPreviewEditor();
  if (!previewEditor) {
    throw new Error('Preview editor not found');
  }

  return previewEditor.document.getText();
}

function getPreviewEditor(): vscode.TextEditor | undefined {
  return vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === 'query-preview:Preview?dbt-language-server');
}

export function getDiagnostics(): vscode.Diagnostic[] {
  return vscode.languages.getDiagnostics(doc.uri);
}

export function sleep(ms: number): Promise<unknown> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export const getDocPath = (p: string): string => {
  return path.resolve(TEST_FIXTURE_PATH, 'models', p);
};

export const getDocUri = (p: string): vscode.Uri => {
  return vscode.Uri.file(getDocPath(p));
};

export const getCustomDocUri = (p: string): vscode.Uri => {
  return vscode.Uri.file(path.resolve(PROJECTS_PATH, p));
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
  const editFinished = createChangePromise('preview');
  await editor.edit(callback);
  await editFinished;
}

async function createChangePromise(type: 'preview' | 'document'): Promise<void> {
  return new Promise<void>(resolve => {
    if (type === 'preview') {
      previewPromiseResolve = resolve;
    } else {
      documentPromiseResolve = resolve;
    }
  });
}

export function getCursorPosition(): vscode.Position {
  return editor.selection.end;
}

export function installExtension(extensionId: string): void {
  installUninstallExtension('install', extensionId);
}

export function uninstallExtension(extensionId: string): void {
  installUninstallExtension('uninstall', extensionId);
}

function installUninstallExtension(command: 'install' | 'uninstall', extensionId: string): void {
  const extensionsInstallPathParam = `--extensions-dir=${process.env['EXTENSIONS_INSTALL_PATH'] ?? ''}`;
  runCliCommand([`--${command}-extension=${extensionId}`, extensionsInstallPathParam]);
}

function runCliCommand(args: string[]): void {
  const cliPath = process.env['CLI_PATH'];
  if (!cliPath) {
    throw new Error('CLI_PATH environment variable not found');
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

  assertThat(actualCompletionList.items.length, greaterThanOrEqualTo(expectedCompletionList.items.length));
  expectedCompletionList.items.forEach((expectedItem, i) => {
    const actualItem = actualCompletionList.items[i];
    assertThat(actualItem.label, expectedItem.label);
    assertThat(actualItem.kind, expectedItem.kind);
  });
}

export async function triggerCompletion(
  docUri: vscode.Uri,
  position: vscode.Position,
  triggerChar?: string,
): Promise<vscode.CompletionList<vscode.CompletionItem>> {
  // Executing the command `vscode.executeCompletionItemProvider` to simulate triggering completion
  return vscode.commands.executeCommand<vscode.CompletionList>('vscode.executeCompletionItemProvider', docUri, position, triggerChar);
}
