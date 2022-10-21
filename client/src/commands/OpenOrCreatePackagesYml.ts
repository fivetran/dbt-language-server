import { TextEncoder } from 'node:util';
import { TextEditor, Uri, ViewColumn, window, workspace } from 'vscode';
import { PACKAGES_YML } from '../Utils';
import { Command } from './CommandManager';

export class OpenOrCreatePackagesYml implements Command {
  static readonly ID = 'WizardForDbtCore(TM).openOrCreatePackagesYml';
  readonly id = OpenOrCreatePackagesYml.ID;

  async execute(projectPath: string): Promise<TextEditor> {
    return OpenOrCreatePackagesYml.openOrCreateConfig(projectPath);
  }

  static async openOrCreateConfig(projectPath: string): Promise<TextEditor> {
    const column = window.activeTextEditor?.viewColumn;
    const fileUri = Uri.joinPath(Uri.parse(projectPath), PACKAGES_YML);

    try {
      return await OpenOrCreatePackagesYml.openExistingDocument(fileUri, column);
    } catch {
      await workspace.fs.writeFile(fileUri, new TextEncoder().encode(''));
      return OpenOrCreatePackagesYml.openExistingDocument(fileUri, column);
    }
  }

  private static async openExistingDocument(fileUri: Uri, column: ViewColumn | undefined): Promise<TextEditor> {
    const existingDocument = await workspace.openTextDocument(fileUri);
    return window.showTextDocument(existingDocument, column);
  }
}
