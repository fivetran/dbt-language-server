import { extensions, Uri, WorkspaceFolder } from 'vscode';

interface IExtensionApi {
  settings: {
    getExecutionDetails(resource?: Resource): {
      execCommand: string[] | undefined;
    };
  };
}

type Resource = Uri | undefined;

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

    const details = (extension.exports as IExtensionApi).settings.getExecutionDetails(workspaceFolder?.uri);
    if (!details.execCommand) {
      console.log('ms-python.python not found');
      return '';
    }

    const [path] = details.execCommand;

    console.log(`Python path used: ${path}`);
    return path;
  }
}
