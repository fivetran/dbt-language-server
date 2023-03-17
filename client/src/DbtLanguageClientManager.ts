import { EventEmitter } from 'node:events';
import { FileType, Selection, TextDocument, Uri, window, workspace } from 'vscode';
import { log } from './Logger';
import { OutputChannelProvider } from './OutputChannelProvider';
import { ProgressHandler } from './ProgressHandler';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { DBT_PROJECT_YML, isDocumentSupported } from './Utils';
import { WorkspaceHelper } from './WorkspaceHelper';
import { DbtLanguageClient } from './lsp_client/DbtLanguageClient';
import { DbtWizardLanguageClient } from './lsp_client/DbtWizardLanguageClient';
import { NoProjectLanguageClient } from './lsp_client/NoProjectLanguageClient';
import { StatusHandler } from './status/StatusHandler';

export class DbtLanguageClientManager {
  workspaceHelper = new WorkspaceHelper();
  clients: Map<string, DbtLanguageClient> = new Map();
  progressHandler = new ProgressHandler();
  noProjectClient?: NoProjectLanguageClient;

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
    const editor = window.visibleTextEditors.find(e => e.document.uri.toString() === SqlPreviewContentProvider.URI.toString());

    for (const client of this.clients.values()) {
      const clientDiagnostics = client.getDiagnostics();
      clientDiagnostics?.set(
        SqlPreviewContentProvider.URI,
        editor && this.previewContentProvider.activeDocUri.fsPath.startsWith(client.getProjectUri().fsPath) ? previewDiagnostics : [],
      );
    }

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
    const projectUri = await this.getOuterMostDbtProjectUri(uri);
    return projectUri ? this.getClientByPath(projectUri.fsPath) : undefined;
  }

  getClientByPath(projectPath: string): DbtLanguageClient | undefined {
    return this.clients.get(projectPath);
  }

  /** We expect the dbt project folder to be the folder containing the dbt_project.yml file. This folder is used to run dbt-rpc. */
  async getOuterMostDbtProjectUri(fileUri: Uri): Promise<Uri | undefined> {
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
    let outerMostProjectUri: Uri | undefined = undefined;
    do {
      currentUri = Uri.joinPath(currentUri, '..');
      try {
        const stat = await workspace.fs.stat(Uri.joinPath(currentUri, DBT_PROJECT_YML));
        if (stat.type !== FileType.Directory) {
          outerMostProjectUri = currentUri;
        }
      } catch {
        // file does not exist
      }
    } while (currentUri.fsPath !== outerWorkspace.uri.fsPath);
    return outerMostProjectUri;
  }

  async ensureClient(documentUri: Uri): Promise<void> {
    const projectUri = await this.getOuterMostDbtProjectUri(documentUri);
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
      await this.initAndStartClient(client);
    }
  }

  async initAndStartClient(client: DbtWizardLanguageClient): Promise<void> {
    await client.initialize();
    await client.start();
  }

  async ensureNoProjectClient(): Promise<void> {
    if (!this.noProjectClient) {
      this.noProjectClient = new NoProjectLanguageClient(6008, this.outputChannelProvider, this.statusHandler, this.serverAbsolutePath);
      await this.initAndStartClient(this.noProjectClient);
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
