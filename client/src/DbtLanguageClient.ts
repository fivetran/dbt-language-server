import { CustomInitParams, DbtCompilerType, StatusNotification, TelemetryEvent } from 'dbt-language-server-common';
import { commands, Diagnostic, RelativePattern, Uri, workspace, WorkspaceFolder } from 'vscode';
import { Disposable, LanguageClient, LanguageClientOptions, State, TransportKind, WorkDoneProgress } from 'vscode-languageclient/node';
import { SUPPORTED_LANG_IDS } from './ExtensionClient';
import { OutputChannelProvider } from './OutputChannelProvider';
import { ProgressHandler } from './ProgressHandler';
import { PythonExtension } from './python/PythonExtension';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { TelemetryClient } from './TelemetryClient';

export class DbtLanguageClient implements Disposable {
  client: LanguageClient;
  disposables: Disposable[] = [];
  workspaceFolder?: WorkspaceFolder;

  constructor(
    port: number,
    outputChannelProvider: OutputChannelProvider,
    module: string,
    private dbtProjectUri: Uri,
    private previewContentProvider: SqlPreviewContentProvider,
    private progressHandler: ProgressHandler,
    private statusHandler: StatusHandler,
  ) {
    const debugOptions = { execArgv: ['--nolazy', `--inspect=${port}`] };
    const serverOptions = {
      run: { module, transport: TransportKind.ipc },
      debug: { module, transport: TransportKind.ipc, options: debugOptions },
    };

    const clientOptions: LanguageClientOptions = {
      documentSelector: SUPPORTED_LANG_IDS.map(langId => ({ scheme: 'file', language: langId, pattern: `${dbtProjectUri.fsPath}/**/*` })),
      diagnosticCollectionName: 'dbtWizard',
      synchronize: {
        fileEvents: [
          workspace.createFileSystemWatcher(new RelativePattern(dbtProjectUri, '**/dbt_project.yml'), undefined, undefined, true),
          workspace.createFileSystemWatcher(new RelativePattern(dbtProjectUri, '**/manifest.json'), undefined, undefined, true),
          workspace.createFileSystemWatcher(new RelativePattern(dbtProjectUri, '**/packages.yml'), undefined, undefined, true),
        ],
      },
      outputChannel: outputChannelProvider.getMainLogChannel(),
      workspaceFolder: { uri: dbtProjectUri, name: dbtProjectUri.path, index: port },
    };

    this.workspaceFolder = workspace.getWorkspaceFolder(dbtProjectUri);

    this.client = new LanguageClient('dbtLanguageServer', 'dbt Wizard', serverOptions, clientOptions);
    this.disposables.push(
      this.client.onNotification('custom/updateQueryPreview', ({ uri, previewText }) => {
        this.previewContentProvider.updateText(uri as string, previewText as string);
      }),

      this.client.onNotification('custom/updateQueryPreviewDiagnostics', ({ uri, diagnostics }) => {
        this.previewContentProvider.updateDiagnostics(uri as string, diagnostics as Diagnostic[]);
      }),

      this.client.onNotification('dbtWizard/status', (statusNotification: StatusNotification) => {
        this.statusHandler.onStatusChanged(statusNotification);
      }),

      this.client.onNotification('dbtWizard/installLatestDbtLog', async (data: string) => {
        outputChannelProvider.getInstallLatestDbtChannel().append(data);
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }),

      this.client.onNotification('dbtWizard/installDbtAdapterLog', async (data: string) => {
        outputChannelProvider.getInstallDbtAdaptersChannel().append(data);
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }),

      this.client.onNotification('dbtWizard/restart', () => {
        this.restart();
      }),

      this.client.onProgress(WorkDoneProgress.type, 'Progress', v => this.progressHandler.onProgress(v)),
    );
  }

  async initialize(): Promise<void> {
    this.disposables.push(
      this.client.onTelemetry((e: TelemetryEvent) => {
        if (e.name === 'error') {
          TelemetryClient.sendError(e.properties);
        } else {
          TelemetryClient.sendEvent(e.name, e.properties);
        }
      }),
    );

    this.client.onDidChangeState(e => {
      console.log(`Client switched to state ${State[e.newState]}`);
    });

    const customInitParams: CustomInitParams = {
      pythonInfo: await new PythonExtension().getPythonInfo(this.client.clientOptions.workspaceFolder),
      dbtCompiler: workspace.getConfiguration('dbtWizard').get('dbtCompiler', 'Auto') as DbtCompilerType,
    };

    this.client.clientOptions.initializationOptions = customInitParams;
  }

  sendNotification(method: string, params?: unknown): void {
    this.client
      .sendNotification(method, params)
      .catch(e => console.log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  start(): void {
    this.client.start().catch(e => console.log(`Error while starting server: ${e instanceof Error ? e.message : String(e)}`));
  }

  restart(): void {
    this.statusHandler.onRestart(this.dbtProjectUri.fsPath);
    this.client.restart().catch(error => this.client.error(`Restarting client failed`, error, 'force'));
  }

  stop(): Promise<void> {
    return this.client.stop();
  }

  dispose(): void {
    this.disposables.forEach(disposable => {
      disposable.dispose();
    });
  }
}
