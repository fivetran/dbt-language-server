import { extensions, workspace } from 'vscode';

export class PythonExtension {
  async getPython(): Promise<string> {
    const extension = extensions.getExtension('ms-python.python')!;

    if (!extension.isActive) {
      await extension.activate();
    }
    await extension.exports.ready;

    const details = extension.exports.settings.getExecutionDetails(workspace.workspaceFile);
    return details.execCommand[0];
  }
}
