import { PythonInfo } from 'dbt-language-server-common';
import { extensions, WorkspaceFolder } from 'vscode';
import { IExtensionApi, IProposedExtensionAPI } from './PythonApi';

export class PythonExtension {
  async getPythonInfo(workspaceFolder?: WorkspaceFolder): Promise<PythonInfo | undefined> {
    const extension = extensions.getExtension('ms-python.python');
    if (!extension) {
      return this.pythonNotFound();
    }

    if (!extension.isActive) {
      await extension.activate();
    }

    const api = extension.exports as IExtensionApi & IProposedExtensionAPI;

    const details = api.settings.getExecutionDetails(workspaceFolder?.uri);
    if (!details.execCommand) {
      return this.pythonNotFound();
    }

    const [path] = details.execCommand;

    if (path === '') {
      return this.pythonNotFound();
    }
    console.log(`Python path used: ${path}`);

    const envDetails = await api.environment.getEnvironmentDetails(path);

    return { path, version: envDetails?.version };
  }

  pythonNotFound(): undefined {
    console.log('ms-python.python not found');
    return undefined;
  }
}
