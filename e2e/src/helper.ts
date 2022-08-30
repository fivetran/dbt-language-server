import * as clipboard from 'clipboardy';
import { deferred, DeferredResult, ExtensionApi, LS_MANIFEST_PARSED_EVENT } from 'dbt-language-server-common';
import { spawnSync, SpawnSyncReturns } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { setTimeout } from 'node:timers/promises';
import { pathEqual } from 'path-equal';
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
export const COMPLETION_JINJA_PATH = path.resolve(PROJECTS_PATH, 'completion-jinja');
export const PREVIEW_URI = 'query-preview:Preview?dbt-language-server';

export const MAX_VSCODE_INTEGER = 2_147_483_647;
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
const languageServerReady = new Array<[string, DeferredResult<void>]>();

let tempModelIndex = 0;

export async function activateAndWait(docUri: Uri): Promise<void> {
  const existingEditor = findExistingEditor(docUri);
  const doNotWaitChanges = existingEditor && existingEditor.document.getText() === window.activeTextEditor?.document.getText() && getPreviewEditor();
  const activateFinished = doNotWaitChanges ? Promise.resolve() : createChangePromise('preview');

  doc = await workspace.openTextDocument(docUri);
  editor = await window.showTextDocument(doc);
  await showPreview();
  await activateFinished;
}

export async function activateAndWaitManifestParsed(docUri: Uri, projectFolderName: string): Promise<void> {
  const existingEditor = findExistingEditor(docUri);
  doc = await workspace.openTextDocument(docUri);
  editor = await window.showTextDocument(doc);
  await Promise.all([existingEditor ? Promise.resolve() : sleep(LS_MORE_THAN_OPEN_DEBOUNCE), waitForManifestParsed(projectFolderName)]);
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

function waitWithTimeout(promise: Promise<void>, timeout: number): Promise<void> {
  return Promise.race([promise, setTimeout(timeout)]);
}

export async function waitDocumentModification(func: () => Promise<void>): Promise<void> {
  const promise = createChangePromise('document');
  await func();
  await waitWithTimeout(promise, 1000);
}

export async function waitPreviewModification(func?: () => Promise<void>): Promise<void> {
  const promise = createChangePromise('preview');
  if (func) {
    await func();
  }
  await promise;
}

export function getMainEditorText(): string {
  return doc.getText();
}

export async function showPreview(): Promise<void> {
  await commands.executeCommand('dbtWizard.showQueryPreview');
}

export async function closeAllEditors(): Promise<void> {
  await commands.executeCommand('workbench.action.closeAllEditors');
}

export async function compileDocument(): Promise<void> {
  await commands.executeCommand('dbtWizard.compile');
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
  return setTimeout(ms);
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

export async function setTestContent(content: string, waitForPreview = true): Promise<void> {
  await showPreview();

  if (doc.getText() === content) {
    return;
  }

  const all = new Range(doc.positionAt(0), doc.positionAt(doc.getText().length));

  const editCallback = (eb: TextEditorEdit): void => eb.replace(all, content);
  waitForPreview ? await edit(editCallback) : await editor.edit(editCallback);

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
      encoding: 'utf8',
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

export function getLatestDbtVersion(): string {
  const commandResult = spawnSync('dbt', ['--version'], {
    encoding: 'utf8',
  });

  const match = /latest.*:\s+(\d+\.\d+\.\d+)/.exec(commandResult.stderr);
  if (!match) {
    throw new Error('Failed to find latest dbt version');
  }

  const [, latestDbtVersion] = match;
  console.log(`Latest dbt version ${latestDbtVersion}`);

  return match[1];
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
    encoding: 'utf8',
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

export async function executeInstallLatestDbt(): Promise<void> {
  return commands.executeCommand('dbtWizard.installLatestDbt', undefined, true);
}

export async function moveCursorLeft(): Promise<unknown> {
  return commands.executeCommand('cursorMove', {
    to: 'left',
    by: 'wrappedLine',
    select: false,
    value: 1,
  });
}

export async function createAndOpenTempModel(workspaceName: string, waitFor: 'preview' | 'manifest' = 'preview'): Promise<Uri> {
  const thisWorkspaceUri = workspace.workspaceFolders?.find(w => w.name === workspaceName)?.uri;
  if (thisWorkspaceUri === undefined) {
    throw new Error('Workspace not found');
  }
  const newUri = Uri.parse(`${thisWorkspaceUri.toString()}/models/temp_model${tempModelIndex}.sql`);
  tempModelIndex++;

  console.log(`Creating new file: ${newUri.toString()}`);
  fs.writeFileSync(newUri.fsPath, '-- Empty');

  waitFor === 'preview' ? await activateAndWait(newUri) : await activateAndWaitManifestParsed(newUri, thisWorkspaceUri.path);
  if (waitFor === 'manifest') {
    console.log(`createAndOpenTempModel: wait for manifest parsed in '${thisWorkspaceUri.path}'`);
  }

  return newUri;
}

export async function renameCurrentFile(newName: string): Promise<Uri> {
  const { uri } = doc;
  const newUri = uri.with({ path: uri.path.slice(0, uri.path.lastIndexOf('/') + 1) + newName });

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

export function waitForManifestParsed(projectFolderName: string): Promise<void> {
  console.log(`waitForManifestParsed '${normalizePath(projectFolderName)}'`);
  return getLanguageServerReadyDeferred(projectFolderName).promise;
}

export async function initializeExtension(): Promise<void> {
  const ext = extensions.getExtension('Fivetran.dbt-language-server');
  if (!ext) {
    throw new Error('Fivetran.dbt-language-server not found');
  }
  extensionApi = (await ext.activate()) as ExtensionApi;

  extensionApi.manifestParsedEventEmitter.on(LS_MANIFEST_PARSED_EVENT, (languageServerRootPath: string) => {
    console.log(`Language Server '${normalizePath(languageServerRootPath)}' ready`);
    getLanguageServerReadyDeferred(languageServerRootPath).resolve();
  });
}

function getLanguageServerReadyDeferred(rootPath: string): DeferredResult<void> {
  const normalizedPath = normalizePath(rootPath);

  let lsReadyDeferred = languageServerReady.find(r => pathEqual(r[0], normalizedPath));
  if (lsReadyDeferred === undefined) {
    lsReadyDeferred = [normalizedPath, deferred<void>()];
    languageServerReady.push(lsReadyDeferred);
  }

  return lsReadyDeferred[1];
}

function normalizePath(rawPath: string): string {
  return process.platform === 'win32' ? trimPath(rawPath).toLocaleLowerCase() : rawPath;
}

function trimPath(rawPath: string): string {
  return rawPath
    .trim()
    .replace(/^[\\/]+/, '')
    .replace(/[\\/]+$/, '');
}
