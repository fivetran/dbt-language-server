import * as vscode from 'vscode';
import * as path from 'path';

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;

export async function activateAndWait(docUri: vscode.Uri) {
  // The extensionId is `publisher.name` from package.json
  const ext = vscode.extensions.getExtension('Fivetran.dbt-language-server')!;
  await ext.activate();
  try {
    doc = await vscode.workspace.openTextDocument(docUri);
    editor = await vscode.window.showTextDocument(doc);
    const result = <Promise<unknown>>await vscode.commands.executeCommand('dbt.getProgressPromise');
    await result;
  } catch (e) {
    console.error(e);
  }
}

export async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const getDocPath = (p: string) => {
  return path.resolve(__dirname, '../../test-fixture/models', p);
};

export const getDocUri = (p: string) => {
  return vscode.Uri.file(getDocPath(p));
};

export async function setTestContent(content: string): Promise<void> {
  const all = new vscode.Range(doc.positionAt(0), doc.positionAt(doc.getText().length));
  await editor.edit(eb => eb.replace(all, content));
  editor.selection = new vscode.Selection(editor.selection.end, editor.selection.end);
}

export async function insertText(text: string, position: vscode.Position): Promise<void> {
  await editor.edit(eb => eb.insert(position, text));
}

export function getCursorPosition(): vscode.Position {
  return editor.selection.end;
}
