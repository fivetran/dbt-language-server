import { extensions, WorkspaceFolder } from 'vscode';

export class PythonExtension {
  async getPython(workspaceFolder?: WorkspaceFolder): Promise<string> {
    const extension = extensions.getExtension('ms-python.python');
    if (!extension) {
      console.log('ms-python.python not found');
      return '';
    }

    if (!extension.isActive) {
      await extension.activate();
    }

    const details = extension.exports.settings.getExecutionDetails(workspaceFolder?.uri);

    const [path] = details.execCommand;

    console.log(`Python path used: ${path as string}`);
    return path;
  }
}
