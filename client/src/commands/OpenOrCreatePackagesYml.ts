import { TextEditor, Uri, window, workspace } from 'vscode';
import { Command } from './CommandManager';

export class OpenOrCreatePackagesYml implements Command {
  readonly id = 'dbtWizard.openOrCreatePackagesYml';

  async execute(projectPath: string): Promise<TextEditor> {
    return OpenOrCreatePackagesYml.openOrCreateConfig(projectPath);
  }

  static async openOrCreateConfig(projectPath: string): Promise<TextEditor> {
    const column = window.activeTextEditor?.viewColumn;
    const fileUri = Uri.joinPath(Uri.parse(projectPath), 'packages.yml');

    try {
      const existingDocument = await workspace.openTextDocument(fileUri);
      return await window.showTextDocument(existingDocument, column);
    } catch {
      const createdDocument = await workspace.openTextDocument(fileUri.with({ scheme: 'untitled' }));
      return await window.showTextDocument(createdDocument, column);
    }
  }
}
