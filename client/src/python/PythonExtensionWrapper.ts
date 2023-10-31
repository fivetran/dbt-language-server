import { ActiveEnvironmentPathChangeEvent, PythonExtension } from '@vscode/python-extension';
import { PythonInfo } from 'dbt-language-server-common';
import { Event, WorkspaceFolder, workspace } from 'vscode';

export class PythonExtensionWrapper {
  async getExtension(): Promise<PythonExtension> {
    const extension = await PythonExtension.api();
    await extension.ready;
    return extension;
  }

  async onDidChangeActiveEnvironmentPath(): Promise<Event<ActiveEnvironmentPathChangeEvent>> {
    const extension = await this.getExtension();
    return extension.environments.onDidChangeActiveEnvironmentPath;
  }

  async getPythonInfo(workspaceFolder?: WorkspaceFolder): Promise<PythonInfo> {
    const extension = await this.getExtension();

    const envFolderOrPythonPath = extension.environments.getActiveEnvironmentPath(workspaceFolder?.uri).path;

    if (!envFolderOrPythonPath) {
      throw new Error('Python extension not configured. Please select a Python interpreter.');
    }

    const environment = await extension.environments.resolveEnvironment(envFolderOrPythonPath);

    const path = environment?.path ?? envFolderOrPythonPath;

    const major = String(environment?.version?.major ?? 3);
    const minor = String(environment?.version?.minor ?? 10);
    const micro = String(environment?.version?.micro ?? 0);

    const pythonSettings = workspace.getConfiguration('python', workspaceFolder);
    const dotEnvFile = pythonSettings.get<string>('envFile');

    return { path: `"${path}"`, version: [major, minor, micro], dotEnvFile };
  }
}
