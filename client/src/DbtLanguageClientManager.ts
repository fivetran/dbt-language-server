import { EventEmitter } from 'node:events';
import { Selection, TextDocument, Uri, window, workspace } from 'vscode';
import { DBT_PROJECT_YML, PACKAGES_YML, SUPPORTED_LANG_IDS } from './Constants';
import { DbtLanguageClient } from './DbtLanguageClient';
import { ExtensionClient } from './ExtensionClient';
import { log } from './Logger';
import { OutputChannelProvider } from './OutputChannelProvider';
import { ProgressHandler } from './ProgressHandler';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { WorkspaceHelper } from './WorkspaceHelper';

export class DbtLanguageClientManager {
  workspaceHelper = new WorkspaceHelper();
  clients: Map<string, DbtLanguageClient> = new Map();
  progressHandler = new ProgressHandler();

  constructor(
    private previewContentProvider: SqlPreviewContentProvider,
    private outputChannelProvider: OutputChannelProvider,
    private serverAbsolutePath: string,
    private manifestParsedEventEmitter: EventEmitter,
    private statusHandler: StatusHandler,
  ) {
    previewContentProvider.onDidChange(() => this.applyPreviewDiagnostics());
  }

  async applyPreviewDiagnostics(): Promise<void> {
    const previewDiagnostics = this.previewContentProvider.getPreviewDiagnostics();
    const activeClient = await this.getClientForActiveDocument();

    for (const client of this.clients.values()) {
      const clientDiagnostics = client.getDiagnostics();
      clientDiagnostics?.set(SqlPreviewContentProvider.URI, client.getProjectUri() === activeClient?.getProjectUri() ? previewDiagnostics : []);
    }

    const editor = window.visibleTextEditors.find(e => e.document.uri.toString() === SqlPreviewContentProvider.URI.toString());
    if (editor) {
      editor.selection = new Selection(0, 0, 0, 0);
    }
  }

  async getClientForActiveDocument(): Promise<DbtLanguageClient | undefined> {
    const document = this.getActiveDocument();
    if (document === undefined) {
      log(`Can't find active document`);
      return undefined;
    }

    const uri = document.uri.path === SqlPreviewContentProvider.URI.path ? this.previewContentProvider.activeDocUri : document.uri;

    return this.getClientByUri(uri);
  }

  getActiveDocument(): TextDocument | undefined {
    if (!window.activeTextEditor) {
      return undefined;
    }

    const { document } = window.activeTextEditor;

    return SUPPORTED_LANG_IDS.includes(document.languageId) || document.fileName.endsWith(PACKAGES_YML) || document.fileName.endsWith(DBT_PROJECT_YML)
      ? document
      : undefined;
  }

  async getClientByUri(uri: Uri): Promise<DbtLanguageClient | undefined> {
    const projectUri = await this.getDbtProjectUri(uri);
    return projectUri ? this.getClientByPath(projectUri.path) : undefined;
  }

  getClientByPath(projectPath: string): DbtLanguageClient | undefined {
    return this.clients.get(projectPath);
  }

  /** We expect the dbt project folder to be the folder containing the dbt_project.yml file. This folder is used to run dbt-rpc. */
  async getDbtProjectUri(fileUri: Uri): Promise<Uri | undefined> {
    const folder = workspace.getWorkspaceFolder(fileUri);
    if (!folder) {
      return undefined;
    }

    const projectFolder = [...this.clients.keys()].find(k => fileUri.path.startsWith(k));
    if (projectFolder) {
      return Uri.parse(projectFolder);
    }

    const outerWorkspace = this.workspaceHelper.getOuterMostWorkspaceFolder(folder);

    let currentUri = fileUri;
    do {
      currentUri = Uri.joinPath(currentUri, '..');
      try {
        await workspace.fs.stat(currentUri.with({ path: `${currentUri.path}/${DBT_PROJECT_YML}` }));
        const oneLevelUpPath = Uri.joinPath(currentUri, '..').path;
        if (!ExtensionClient.DEFAULT_PACKAGES_PATHS.some(p => oneLevelUpPath.endsWith(p))) {
          return currentUri;
        }
      } catch {
        // file does not exist
      }
    } while (currentUri.path !== outerWorkspace.uri.path);
    return undefined;
  }

  async ensureClient(document: TextDocument): Promise<void> {
    const projectUri = await this.getDbtProjectUri(document.uri);
    if (!projectUri) {
      return;
    }

    if (!this.clients.has(projectUri.path)) {
      const client = new DbtLanguageClient(
        6009 + this.clients.size,
        this.outputChannelProvider,
        this.serverAbsolutePath,
        projectUri,
        this.previewContentProvider,
        this.progressHandler,
        this.manifestParsedEventEmitter,
        this.statusHandler,
      );
      this.clients.set(projectUri.path, client);

      await client.initialize();

      this.progressHandler.begin();

      client.start();
    }
  }

  stopClient(projectPath: string): void {
    const client = this.getClientByPath(projectPath);
    if (client) {
      this.clients.delete(projectPath);
      client.stop().catch(e => log(`Error while stopping client: ${e instanceof Error ? e.message : String(e)}`));
    }
  }

  dispose(): void {
    for (const client of this.clients.values()) {
      client.dispose();
    }
  }

  onDeactivate(): Thenable<void> {
    const promises: Thenable<void>[] = [];
    for (const client of this.clients.values()) {
      promises.push(client.stop());
    }
    return Promise.all(promises).then(() => undefined);
  }
}
