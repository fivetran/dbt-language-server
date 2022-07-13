import { extensions, Uri, WorkspaceFolder } from 'vscode';

// See https://github.com/microsoft/vscode-python/blob/3698950c97982f31bb9dbfc19c4cd8308acda284/src/client/api.ts#L22
interface IExtensionApi {
  settings: {
    getExecutionDetails(resource?: Resource): {
      execCommand: string[] | undefined;
    };
  };
}

type Resource = Uri | undefined;

export class PythonExtension {
  async getPython(workspaceFolder?: WorkspaceFolder): Promise<string | undefined> {
    const extension = extensions.getExtension('ms-python.python');
    if (!extension) {
      return this.pythonNotFound();
    }

    if (!extension.isActive) {
      await extension.activate();
    }

    const details = (extension.exports as IExtensionApi).settings.getExecutionDetails(workspaceFolder?.uri);
    if (!details.execCommand) {
      return this.pythonNotFound();
    }

    const [path] = details.execCommand;

    if (path === '') {
      return this.pythonNotFound();
    }
    console.log(`Python path used: ${path}`);
    return path;
  }

  pythonNotFound(): undefined {
    console.log('ms-python.python not found');
    return undefined;
  }
}
