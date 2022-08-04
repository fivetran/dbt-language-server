import { spawnSync, SpawnSyncReturns } from 'child_process';
import * as clipboard from 'clipboardy';
import { DebugEvent, deferred, DeferredResult, ExtensionApi } from 'dbt-language-server-common';
import * as fs from 'fs';
import { WatchEventType, writeFileSync } from 'fs';
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
  SignatureHelp,
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
const DOWNLOADS_PATH = path.resolve(__dirname, '../.downloads');
export const TEST_FIXTURE_PATH = path.resolve(PROJECTS_PATH, 'test-fixture');
export const POSTGRES_PATH = path.resolve(PROJECTS_PATH, 'postgres');
export const PREVIEW_URI = 'query-preview:Preview?dbt-language-server';

export const MAX_VSCODE_INTEGER = 2147483647;
export const MAX_RANGE = new Range(0, 0, MAX_VSCODE_INTEGER, MAX_VSCODE_INTEGER);
export const MIN_RANGE = new Range(0, 0, 0, 0);

export const LS_MORE_THAN_OPEN_DEBOUNCE = 1200;

workspace.onDidChangeTextDocument(onDidChangeTextDocument);

window.onDidChangeActiveTextEditor(e => {
  console.log(`Active document changed: ${e?.document.uri.toString() ?? 'undefined'}`);
});

let previewPromiseResolve: voidFunc | undefined;
let documentPromiseResolve: voidFunc | undefined;

let extensionApi: ExtensionApi | undefined = undefined;
const languageServerReady = new Map<string, DeferredResult<void>>();

let tempModelIndex = 0;

export async function openTextDocument(docUri: Uri): Promise<void> {
  await workspace.openTextDocument(docUri);
  editor = await window.showTextDocument(docUri);
}

export async function activateAndWait(docUri: Uri): Promise<void> {
  // The extensionId is `publisher.name` from package.json
  const ext = extensions.getExtension('Fivetran.dbt-language-server');
  if (!ext) {
    throw new Error('Fivetran.dbt-language-server not found');
  }

  const existingEditor = findExistingEditor(docUri);
  const doNotWaitChanges = existingEditor && existingEditor.document.getText() === window.activeTextEditor?.document.getText() && getPreviewEditor();
  const activateFinished = doNotWaitChanges ? Promise.resolve() : createChangePromise('preview');

  await ext.activate();

  doc = await workspace.openTextDocument(docUri);
  editor = await window.showTextDocument(doc);
  await showPreview();
  await activateFinished;
}

export async function activateAndWaitServerReady(docUri: Uri, projectFolderName: string): Promise<void> {
  doc = await workspace.openTextDocument(docUri);
  editor = await window.showTextDocument(doc);
  await Promise.all([sleep(LS_MORE_THAN_OPEN_DEBOUNCE), waitForLanguageServerReady(projectFolderName)]);
}

function findExistingEditor(docUri: Uri): TextEditor | undefined {
  return window.visibleTextEditors.find(e => e.document.uri.path === docUri.path);
}

function onDidChangeTextDocument(e: TextDocumentChangeEvent): void {
  if (e.document.uri.path === 'Preview' && previewPromiseResolve) {
    if (
      // When we switch to a new document, the preview content is set to '' we skip this such events here
      e.contentChanges.length === 1 &&
      e.contentChanges[0].text === '' &&
      e.contentChanges[0].range.start.line === 0 &&
      e.contentChanges[0].range.start.character === 0
    ) {
      return;
    }
    previewPromiseResolve();
  } else if (e.document === doc && documentPromiseResolve) {
    documentPromiseResolve();
  }
}

function waitWithTimeout(promise: Promise<void>, ms: number): Promise<void> {
  const timeoutPromise = new Promise<void>(resolve => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

export async function waitDocumentModification(func: () => Promise<void>): Promise<void> {
  const promise = createChangePromise('document');
  await func();
  await waitWithTimeout(promise, 1000);
}

export async function waitPreviewModification(func: () => Promise<void>): Promise<void> {
  const promise = createChangePromise('preview');
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

export async function compileDocument(): Promise<void> {
  await commands.executeCommand('dbt.compile');
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

export async function waitManifestJson(projectFolderName: string): Promise<void> {
  const projectPath = getAbsolutePath(projectFolderName);
  if (fs.existsSync(path.resolve(projectPath, 'target', 'manifest.json'))) {
    console.log('manifest.json already exists. Wait when it parsed.');
    await sleep(200);
    return;
  }

  let resolveFunc: voidFunc;
  const result = new Promise<void>(resolve => {
    resolveFunc = resolve;
  });
  fs.watch(projectPath, { recursive: true }, async (event: WatchEventType, fileName: string) => {
    if (fileName.endsWith('manifest.json')) {
      console.log('manifest.json created. Wait when it parsed.');
      await sleep(200);
      resolveFunc();
    }
  });
  await result;
}

export const getDocPath = (p: string): string => {
  return path.resolve(TEST_FIXTURE_PATH, 'models', p);
};

export const getDocUri = (docName: string): Uri => {
  return Uri.file(getDocPath(docName));
};

export const getAbsolutePath = (pathRelativeToProject: string): string => {
  return path.resolve(PROJECTS_PATH, pathRelativeToProject);
};

export const getCustomDocUri = (p: string): Uri => {
  return Uri.file(getAbsolutePath(p));
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

export async function appendText(value: string): Promise<void> {
  return insertText(editor.document.positionAt(editor.document.getText().length), value);
}

export async function insertText(position: Position, value: string): Promise<void> {
  return edit(eb => eb.insert(position, value));
}

export async function replaceText(oldText: string, newText: string): Promise<void> {
  return edit(prepareReplaceTextCallback(oldText, newText));
}

function prepareReplaceTextCallback(oldText: string, newText: string): (editBuilder: TextEditorEdit) => void {
  const offsetStart = editor.document.getText().indexOf(oldText);
  if (offsetStart === -1) {
    throw new Error(`text "${oldText}"" not found in "${editor.document.getText()}"`);
  }

  const positionStart = editor.document.positionAt(offsetStart);
  const positionEnd = editor.document.positionAt(offsetStart + oldText.length);

  return eb => eb.replace(new Range(positionStart, positionEnd), newText);
}

async function edit(callback: (editBuilder: TextEditorEdit) => void): Promise<void> {
  return waitPreviewModification(async () => {
    await editor.edit(callback);
  });
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

export function installDbtPackages(projectFolder: string): void {
  spawnSync('dbt', ['deps'], { cwd: getAbsolutePath(projectFolder) });
}

export function installExtension(extensionId: string): void {
  const installResult = installUninstallExtension('install', extensionId);
  if (installResult.status !== 0) {
    console.log(`Failed to install '${extensionId}' extension from marketplace.`);

    ensureDirectoryExists(DOWNLOADS_PATH);
    const extensionFilePath = path.resolve(DOWNLOADS_PATH, `${extensionId}.vsix`);

    const downloadResult = spawnSync('npx', ['ovsx', 'get', extensionId, '-o', extensionFilePath], {
      encoding: 'utf-8',
      stdio: 'inherit',
    });

    if (downloadResult.status !== 0) {
      console.error(`Failed to download '${extensionId}' extension from open-vsx.`);
      process.exit(1);
    }

    const openVsxInstallResult = installUninstallExtension('install', extensionFilePath);
    if (openVsxInstallResult.status !== 0) {
      console.log(`Failed to install '${extensionId}' extension from open-vsx.`);
      process.exit(1);
    }
  }
}

export function uninstallExtension(extensionId: string): void {
  installUninstallExtension('uninstall', extensionId);
}

function installUninstallExtension(command: 'install' | 'uninstall', extensionId: string): SpawnSyncReturns<string> {
  const extensionsInstallPathParam = `--extensions-dir=${process.env['EXTENSIONS_INSTALL_PATH'] ?? ''}`;
  return runCliCommand([`--${command}-extension=${extensionId}`, extensionsInstallPathParam]);
}

function runCliCommand(args: string[]): SpawnSyncReturns<string> {
  const cliPath = process.env['CLI_PATH'];
  if (!cliPath) {
    throw new Error('CLI_PATH environment variable not found');
  }

  return spawnSync(cliPath, args, {
    encoding: 'utf-8',
    stdio: 'inherit',
  });
}

export async function triggerCompletion(docUri: Uri, position: Position, triggerChar?: string): Promise<CompletionList<CompletionItem>> {
  // Simulate triggering completion
  return commands.executeCommand<CompletionList>('vscode.executeCompletionItemProvider', docUri, position, triggerChar);
}

export async function triggerDefinition(docUri: Uri, position: Position): Promise<DefinitionLink[]> {
  return commands.executeCommand<DefinitionLink[]>('vscode.executeDefinitionProvider', docUri, position);
}

export async function executeSignatureHelpProvider(docUri: Uri, position: Position, triggerChar?: string): Promise<SignatureHelp> {
  return commands.executeCommand<SignatureHelp>('vscode.executeSignatureHelpProvider', docUri, position, triggerChar);
}

export async function moveCursorLeft(): Promise<unknown> {
  return commands.executeCommand('cursorMove', {
    to: 'left',
    by: 'wrappedLine',
    select: false,
    value: 1,
  });
}

export async function createAndOpenTempModel(workspaceName: string): Promise<Uri> {
  const thisWorkspace = workspace.workspaceFolders?.find(w => w.name === workspaceName)?.uri.toString();
  if (thisWorkspace === undefined) {
    throw new Error('Workspace not found');
  }
  const newUri = Uri.parse(`${thisWorkspace}/models/temp_model${tempModelIndex}.sql`);
  tempModelIndex++;

  console.log(`Creating new file: ${newUri.toString()}`);
  writeFileSync(newUri.fsPath, '-- Empty');
  await activateAndWait(newUri);
  return newUri;
}

export async function renameCurrentFile(newName: string): Promise<Uri> {
  const { uri } = doc;
  const newUri = uri.with({ path: uri.path.substring(0, uri.path.lastIndexOf('/') + 1) + newName });

  const renameFinished = createChangePromise('preview');

  clipboard.writeSync(newName);

  await commands.executeCommand('workbench.files.action.showActiveFileInExplorer');
  await commands.executeCommand('renameFile');
  await commands.executeCommand('editor.action.selectAll');
  await commands.executeCommand('editor.action.clipboardPasteAction');
  await commands.executeCommand('workbench.action.showCommands');

  await renameFinished;

  doc = await workspace.openTextDocument(newUri);
  editor = await window.showTextDocument(doc);

  return newUri;
}

export async function deleteCurrentFile(): Promise<void> {
  const deleteFinished = createChangePromise('preview');

  await commands.executeCommand('workbench.files.action.showActiveFileInExplorer');
  await commands.executeCommand('deleteFile');

  await deleteFinished;
}

export function getTextInQuotesIfNeeded(text: string, withQuotes: boolean): string {
  return withQuotes ? `'${text}'` : text;
}

export function ensureDirectoryExists(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
}

export function waitForLanguageServerReady(projectFolderName: string): Promise<void> {
  console.log(`waitForLanguageServerReady '${projectFolderName}'`);
  return getLanguageServerReadyDeferred(projectFolderName).promise;
}

export function initializeExtensionApi(): void {
  const dbtLanguageServer = extensions.getExtension('fivetran.dbt-language-server');
  if (dbtLanguageServer) {
    extensionApi = dbtLanguageServer.exports as ExtensionApi;
  } else {
    throw new Error("Extension with id 'fivetran.dbt-language-server' not found");
  }

  extensionApi.languageServerEventEmitter.on(DebugEvent[DebugEvent.LANGUAGE_SERVER_READY], (languageServerRootPath: string) => {
    console.log(`Language Server '${languageServerRootPath}' ready`);
    getLanguageServerReadyDeferred(languageServerRootPath).resolve();
  });
}

function getLanguageServerReadyDeferred(rootPath: string): DeferredResult<void> {
  let lsReadyDeferred = languageServerReady.get(rootPath);
  if (lsReadyDeferred === undefined) {
    lsReadyDeferred = deferred<void>();
    languageServerReady.set(rootPath, lsReadyDeferred);
  }
  return lsReadyDeferred;
}
