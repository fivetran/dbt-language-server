import { extensions, workspace } from 'vscode';

export class PythonExtension {
  async getPython(): Promise<string> {
    const extension = extensions.getExtension('ms-python.python');
    if (!extension) {
      console.log('ms-python.python not found');
      return '';
    }

    if (!extension.isActive) {
      await extension.activate();
    }

    const details = extension.exports.settings.getExecutionDetails(workspace.workspaceFile);
    const path = details.execCommand[0];

    console.log(`Python path used: ${path}`);
    return path;
  }
}
