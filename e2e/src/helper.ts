import { spawnSync } from 'child_process';
import { assertThat, greaterThanOrEqualTo } from 'hamjest';
import * as path from 'path';
import {
  commands,
  CompletionItem,
  CompletionList,
  DefinitionLink,
  extensions,
  Position,
  Range,
  Selection,
  TextDocument,
  TextDocumentChangeEvent,
  TextEditor,
  TextEditorEdit,
  Uri,
  window,
  workspace,
} from 'vscode';

export let doc: TextDocument;
export let editor: TextEditor;

type voidFunc = () => void;

const PROJECTS_PATH = path.resolve(__dirname, '../projects');
const TEST_FIXTURE_PATH = path.resolve(PROJECTS_PATH, 'test-fixture');
export const PREVIEW_URI = 'query-preview:Preview?dbt-language-server';

workspace.onDidChangeTextDocument(onDidChangeTextDocument);

let previewPromiseResolve: voidFunc | undefined;
let documentPromiseResolve: voidFunc | undefined;

export async function activateAndWait(docUri: Uri): Promise<void> {
  // The extensionId is `publisher.name` from package.json
  const ext = extensions.getExtension('Fivetran.dbt-language-server');
  if (!ext) {
    throw new Error('Fivetran.dbt-language-server not found');
  }

  const existingEditor = window.visibleTextEditors.find(e => e.document.uri.path === docUri.path);
  const doNotWaitChanges = existingEditor && existingEditor.document.getText() === window.activeTextEditor?.document.getText() && getPreviewEditor();
  if (doNotWaitChanges) {
    console.log(`doNotWaitChanges. existingEditor: ${existingEditor.document.uri.toString()} activeEditor: ${window.activeTextEditor?.document}`);
  }
  const activateFinished = doNotWaitChanges ? Promise.resolve() : createChangePromise('preview');

  await ext.activate();
  doc = await workspace.openTextDocument(docUri);
  editor = await window.showTextDocument(doc);
  await showPreview();
  await activateFinished;
}

function onDidChangeTextDocument(e: TextDocumentChangeEvent): void {
  console.log(JSON.stringify(e.contentChanges));
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
  await commands.executeCommand('editor.showQueryPreview');
}

export async function closeAllEditors(): Promise<void> {
  await commands.executeCommand('workbench.action.closeAllEditors');
}

export function getPreviewText(): string {
  const previewEditor = getPreviewEditor();
  if (!previewEditor) {
    throw new Error('Preview editor not found');
  }

  return previewEditor.document.getText();
}

function getPreviewEditor(): TextEditor | undefined {
  return window.visibleTextEditors.find(e => e.document.uri.toString() === PREVIEW_URI);
}

export function sleep(ms: number): Promise<unknown> {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

export const getDocPath = (p: string): string => {
  return path.resolve(TEST_FIXTURE_PATH, 'models', p);
};

export const getDocUri = (p: string): Uri => {
  return Uri.file(getDocPath(p));
};

export const getCustomDocUri = (p: string): Uri => {
  return Uri.file(path.resolve(PROJECTS_PATH, p));
};

export async function setTestContent(content: string): Promise<void> {
  if (doc.getText() === content) {
    return;
  }
  const all = new Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  await edit(eb => eb.replace(all, content));
  const lastPos = doc.positionAt(doc.getText().length);
  editor.selection = new Selection(lastPos, lastPos);
}

export async function insertText(position: Position, value: string): Promise<void> {
  return edit(eb => eb.insert(position, value));
}

export async function replaceText(oldText: string, newText: string): Promise<void> {
  const offsetStart = editor.document.getText().indexOf(oldText);
  if (offsetStart === -1) {
    throw new Error(`text "${oldText}"" not found in "${editor.document.getText()}"`);
  }

  const positionStart = editor.document.positionAt(offsetStart);
  const positionEnd = editor.document.positionAt(offsetStart + oldText.length);

  return edit(eb => eb.replace(new Range(positionStart, positionEnd), newText));
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

export function getCursorPosition(): Position {
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

export async function testCompletion(docUri: Uri, position: Position, expectedCompletionList: CompletionList, triggerChar?: string): Promise<void> {
  const actualCompletionList = await triggerCompletion(docUri, position, triggerChar);

  assertThat(actualCompletionList.items.length, greaterThanOrEqualTo(expectedCompletionList.items.length));
  expectedCompletionList.items.forEach((expectedItem, i) => {
    const actualItem = actualCompletionList.items[i];
    assertThat(actualItem.label, expectedItem.label);
    assertThat(actualItem.kind, expectedItem.kind);
  });
}

export async function triggerCompletion(docUri: Uri, position: Position, triggerChar?: string): Promise<CompletionList<CompletionItem>> {
  // Simulate triggering completion
  return commands.executeCommand<CompletionList>('vscode.executeCompletionItemProvider', docUri, position, triggerChar);
}

export async function triggerDefinition(docUri: Uri, position: Position): Promise<DefinitionLink[]> {
  return commands.executeCommand<DefinitionLink[]>('vscode.executeDefinitionProvider', docUri, position);
}
