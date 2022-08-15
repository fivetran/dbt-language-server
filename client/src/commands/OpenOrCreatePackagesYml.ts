import { Uri, window, workspace } from 'vscode';
import { Command } from './CommandManager';

export class OpenOrCreatePackagesYml implements Command {
  readonly id = 'dbtWizard.openOrCreatePackagesYml';

  async execute(projectPath: string): Promise<void> {
    const column = window.activeTextEditor?.viewColumn;
    const fileUri = Uri.joinPath(Uri.parse(projectPath), 'packages.yml');

    try {
      const document = await workspace.openTextDocument(fileUri);
      await window.showTextDocument(document, column);
    } catch {
      const doc = await workspace.openTextDocument(fileUri.with({ scheme: 'untitled' }));
      await window.showTextDocument(doc, column);
    }
  }
}
