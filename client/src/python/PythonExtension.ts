import { PythonInfo } from 'dbt-language-server-common';
import { Event, Extension, extensions, Uri, WorkspaceFolder } from 'vscode';
import { log } from '../Logger';
import { IExtensionApi, ProposedExtensionAPI } from './PythonApi';

export class PythonExtension {
  extension: Extension<unknown>;

  constructor() {
    const extension = extensions.getExtension('ms-python.python');
    if (!extension) {
      throw new Error('Could not find Python extension');
    }
    this.extension = extension;

    this.activate().catch(e => log(`Error while activating Python extension: ${e instanceof Error ? e.message : String(e)}`));
  }

  async onDidChangeExecutionDetails(): Promise<Event<Uri | undefined>> {
    await this.activate();

    return (this.extension.exports as IExtensionApi).settings.onDidChangeExecutionDetails;
  }

  async getPythonInfo(workspaceFolder?: WorkspaceFolder): Promise<PythonInfo | undefined> {
    await this.activate();

    const api = this.extension.exports as IExtensionApi & ProposedExtensionAPI;

    const details = api.settings.getExecutionDetails(workspaceFolder?.uri);
    if (!details.execCommand) {
      return this.pythonNotFound();
    }

    const [path] = details.execCommand;

    if (path === '') {
      return this.pythonNotFound();
    }

    const environment = await api.environments.resolveEnvironment(path);
    const major = String(environment?.version.major ?? 3);
    const minor = String(environment?.version.minor ?? 10);
    const micro = String(environment?.version.micro ?? 0);

    return { path: `"${path}"`, version: [major, minor, micro] };
  }

  async activate(): Promise<void> {
    if (!this.extension.isActive) {
      await this.extension.activate();
    }
  }

  pythonNotFound(): undefined {
    log('ms-python.python not found');
    return undefined;
  }
}
