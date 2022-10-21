import { EventEmitter } from 'node:events';
import { FileType, Selection, TextDocument, Uri, window, workspace } from 'vscode';
import { DbtLanguageClient } from './DbtLanguageClient';
import { log } from './Logger';
import { OutputChannelProvider } from './OutputChannelProvider';
import { ProgressHandler } from './ProgressHandler';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { DBT_PROJECT_YML, DEFAULT_PACKAGES_PATHS, INTEGRATION_TEST_PROJECT_NAME, isDocumentSupported } from './Utils';
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

  applyPreviewDiagnostics(): void {
    const previewDiagnostics = this.previewContentProvider.getPreviewDiagnostics();

    for (const client of this.clients.values()) {
      const clientDiagnostics = client.getDiagnostics();
      clientDiagnostics?.set(
        SqlPreviewContentProvider.URI,
        this.previewContentProvider.activeDocUri.fsPath.startsWith(client.getProjectUri().fsPath) ? previewDiagnostics : [],
      );
    }

    const editor = window.visibleTextEditors.find(e => e.document.uri.toString() === SqlPreviewContentProvider.URI.toString());
    if (editor) {
      editor.selection = new Selection(0, 0, 0, 0);
    }
  }

  async getClientForActiveDocument(): Promise<DbtLanguageClient | undefined> {
    const document = this.getActiveDocument();
    if (document === undefined) {
      return undefined;
    }

    const uri = SqlPreviewContentProvider.isPreviewDocument(document.uri) ? this.previewContentProvider.activeDocUri : document.uri;

    return this.getClientByUri(uri);
  }

  getActiveDocument(): TextDocument | undefined {
    if (!window.activeTextEditor) {
      return undefined;
    }

    const { document } = window.activeTextEditor;

    return isDocumentSupported(document) ? document : undefined;
  }

  async getClientByUri(uri: Uri): Promise<DbtLanguageClient | undefined> {
    const projectUri = await this.getDbtProjectUri(uri);
    return projectUri ? this.getClientByPath(projectUri.fsPath) : undefined;
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

    const projectFolder = [...this.clients.keys()].find(k => fileUri.fsPath.startsWith(k));
    if (projectFolder) {
      return Uri.file(projectFolder);
    }

    const outerWorkspace = this.workspaceHelper.getOuterMostWorkspaceFolder(folder);

    let currentUri = fileUri;
    do {
      currentUri = Uri.joinPath(currentUri, '..');
      try {
        const stat = await workspace.fs.stat(currentUri.with({ path: `${currentUri.path}/${DBT_PROJECT_YML}` }));
        if (stat.type !== FileType.Directory) {
          const oneLevelUpPath = Uri.joinPath(currentUri, '..').path;
          if (
            !DEFAULT_PACKAGES_PATHS.some(p => oneLevelUpPath.toLocaleLowerCase().endsWith(p)) &&
            !currentUri.fsPath.toLocaleLowerCase().endsWith(INTEGRATION_TEST_PROJECT_NAME)
          ) {
            return currentUri;
          }
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

    if (!this.clients.has(projectUri.fsPath)) {
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
      this.clients.set(projectUri.fsPath, client);

      await client.initialize();

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
