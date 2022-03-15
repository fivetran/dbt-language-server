import { Disposable, OutputChannel, Uri, window, workspace, WorkspaceFolder } from 'vscode';
import { LanguageClient, State, TransportKind, WorkDoneProgress } from 'vscode-languageclient/node';
import { SUPPORTED_LANG_IDS } from './ExtensionClient';
import { ProgressHandler } from './ProgressHandler';
import { PythonExtension } from './PythonExtension';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { TelemetryClient } from './TelemetryClient';

interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export class DbtLanguageClient implements Disposable {
  client: LanguageClient;
  disposables: Disposable[] = [];
  workspaceFolder?: WorkspaceFolder;

  constructor(
    port: number,
    outputChannel: OutputChannel,
    module: string,
    dbtProjectUri: Uri,
    private previewContentProvider: SqlPreviewContentProvider,
    private progressHandler: ProgressHandler,
  ) {
    const debugOptions = { execArgv: ['--nolazy', `--inspect=${port}`] };
    const serverOptions = {
      run: { module, transport: TransportKind.ipc },
      debug: { module, transport: TransportKind.ipc, options: debugOptions },
    };

    const clientOptions = {
      documentSelector: SUPPORTED_LANG_IDS.map(langId => ({ scheme: 'file', language: langId, pattern: `${dbtProjectUri.fsPath}/**/*` })),
      synchronize: {
        fileEvents: [workspace.createFileSystemWatcher('**/dbt_project.yml'), workspace.createFileSystemWatcher('**/manifest.json')],
      },
      outputChannel,
      workspaceFolder: { uri: dbtProjectUri, name: dbtProjectUri.path, index: port },
    };

    this.workspaceFolder = workspace.getWorkspaceFolder(dbtProjectUri);

    this.client = new LanguageClient('dbtLanguageServer', 'dbt Wizard', serverOptions, clientOptions);
  }

  initialize(): void {
    this.disposables.push(
      this.client.onTelemetry((e: TelemetryEvent) => {
        TelemetryClient.sendEvent(e.name, e.properties);
      }),
    );

    this.client.onDidChangeState(e => {
      if (e.newState === State.Running) {
        this.disposables.push(
          this.client.onNotification('custom/updateQueryPreview', ({ uri, previewText }) => {
            this.previewContentProvider.updateText(uri, previewText);
          }),
          this.client.onNotification('custom/updateQueryPreviewDiagnostics', ({ uri, diagnostics }) => {
            this.previewContentProvider.updateDiagnostics(uri, diagnostics);
          }),

          this.client.onRequest('custom/getPython', async () => {
            try {
              return await new PythonExtension().getPython(this.workspaceFolder);
            } catch (err) {
              await window.showErrorMessage(`Error while getting python: ${JSON.stringify(err)}`);
              return 'python3';
            }
          }),

          this.client.onProgress(WorkDoneProgress.type, 'Progress', v => this.progressHandler.onProgress(v)),
        );

        console.log('Client switched to state "Running"');
      }
    });

    this.client.onReady().catch(reason => {
      if (reason && reason.name && reason.message) {
        TelemetryClient.sendException(reason);
      }
    });
  }

  sendNotification(method: string, params: any): void {
    this.client.sendNotification(method, params);
  }

  start(): void {
    this.disposables.push(this.client.start());
  }

  stop(): Promise<void> {
    return this.client.stop();
  }

  dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
  }
}
