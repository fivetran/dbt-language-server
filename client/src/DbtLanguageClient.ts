import { CustomInitParams, DbtCompilerType, LS_MANIFEST_PARSED_EVENT, StatusNotification, TelemetryEvent } from 'dbt-language-server-common';
import { EventEmitter } from 'node:events';
import { commands, Diagnostic, DiagnosticCollection, Disposable, RelativePattern, TextDocument, TextEditor, Uri, window, workspace } from 'vscode';
import { LanguageClient, LanguageClientOptions, ServerOptions, State, TransportKind, WorkDoneProgress } from 'vscode-languageclient/node';
import { ActiveTextEditorHandler } from './ActiveTextEditorHandler';
import { DBT_PROJECT_YML, PACKAGES_YML, SUPPORTED_LANG_IDS } from './Constants';
import { log } from './Logger';
import { OutputChannelProvider } from './OutputChannelProvider';
import { ProgressHandler } from './ProgressHandler';
import { PythonExtension } from './python/PythonExtension';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { TelemetryClient } from './TelemetryClient';

export class DbtLanguageClient implements Disposable {
  client: LanguageClient;
  disposables: Disposable[] = [];
  pythonExtension = new PythonExtension();
  pendingOpenRequests = new Map<string, (data: TextDocument) => Promise<void>>();

  constructor(
    port: number,
    private outputChannelProvider: OutputChannelProvider,
    serverAbsolutePath: string,
    private dbtProjectUri: Uri,
    private previewContentProvider: SqlPreviewContentProvider,
    private progressHandler: ProgressHandler,
    private manifestParsedEventEmitter: EventEmitter,
    private statusHandler: StatusHandler,
  ) {
    this.client = new LanguageClient(
      'dbtWizard',
      'dbt Wizard',
      DbtLanguageClient.createServerOptions(port, serverAbsolutePath),
      DbtLanguageClient.createClientOptions(port, dbtProjectUri, outputChannelProvider, this.disposables, this.pendingOpenRequests),
    );
    window.onDidChangeVisibleTextEditors((e: readonly TextEditor[]) => this.onDidChangeVisibleTextEditors(e));
  }
  onDidChangeVisibleTextEditors(editors: readonly TextEditor[]): void {
    if (this.pendingOpenRequests.size > 0) {
      for (const editor of editors) {
        const openFunc = this.pendingOpenRequests.get(editor.document.uri.fsPath);
        if (openFunc) {
          this.pendingOpenRequests.delete(editor.document.uri.fsPath);
          openFunc(editor.document).catch(e => log(`Error while opening document: ${e instanceof Error ? e.message : String(e)}`));
        }
      }
    }
  }

  static createServerOptions(port: number, module: string): ServerOptions {
    const debugOptions = { execArgv: ['--nolazy', `--inspect=${port}`] };
    return {
      run: { module, transport: TransportKind.ipc },
      debug: { module, transport: TransportKind.ipc, options: debugOptions },
    };
  }

  static createClientOptions(
    port: number,
    dbtProjectUri: Uri,
    outputChannelProvider: OutputChannelProvider,
    disposables: Disposable[],
    pendingOpenRequests: Map<string, (data: TextDocument) => Promise<void>>,
  ): LanguageClientOptions {
    const fileEvents = [
      workspace.createFileSystemWatcher(new RelativePattern(dbtProjectUri, `**/${DBT_PROJECT_YML}`), false, false, true),
      workspace.createFileSystemWatcher(new RelativePattern(dbtProjectUri, '**/manifest.json'), false, false, true),
      workspace.createFileSystemWatcher(new RelativePattern(dbtProjectUri, `**/${PACKAGES_YML}`)),
    ];
    const clientOptions: LanguageClientOptions = {
      documentSelector: SUPPORTED_LANG_IDS.map(langId => ({ scheme: 'file', language: langId, pattern: `${dbtProjectUri.fsPath}/**/*` })),
      diagnosticCollectionName: 'dbtWizard',
      synchronize: { fileEvents },
      outputChannel: outputChannelProvider.getMainLogChannel(),
      traceOutputChannel: outputChannelProvider.getTraceChannel(),
      workspaceFolder: { uri: dbtProjectUri, name: dbtProjectUri.path, index: port },
      middleware: {
        didOpen: (data: TextDocument, next: (data: TextDocument) => Promise<void>): Promise<void> => {
          if (window.visibleTextEditors.some(v => v.document.uri.fsPath === data.uri.fsPath)) {
            return next(data);
          }

          pendingOpenRequests.set(data.uri.fsPath, next);
          setTimeout(() => {
            if (pendingOpenRequests.delete(data.uri.fsPath)) {
              log(`Open request cancelled for ${data.uri.fsPath}`);
            }
          }, 1000);
          return Promise.resolve();
        },
      },
    };
    disposables.push(...fileEvents);
    return clientOptions;
  }

  async initialize(): Promise<void> {
    await this.initPythonParams();
    (await this.pythonExtension.onDidChangeExecutionDetails())(() => this.restart());

    this.initializeNotifications();
    this.initializeEvents();
  }

  initializeNotifications(): void {
    this.disposables.push(
      this.client.onNotification('custom/updateQueryPreview', ({ uri, previewText }) => {
        this.previewContentProvider.updateText(uri as string, previewText as string);
      }),

      this.client.onNotification('custom/updateQueryPreviewDiagnostics', ({ uri, diagnostics }) => {
        if (uri !== this.previewContentProvider.activeDocUri.toString()) {
          this.resendDiagnostics(this.previewContentProvider.activeDocUri.toString());
        }

        this.previewContentProvider.updateDiagnostics(uri as string, diagnostics as Diagnostic[]);
      }),

      this.client.onNotification('custom/manifestParsed', () => {
        this.manifestParsedEventEmitter.emit(LS_MANIFEST_PARSED_EVENT, this.dbtProjectUri.fsPath);
      }),

      this.client.onNotification('dbtWizard/status', (statusNotification: StatusNotification) => {
        const { lastActiveEditor } = ActiveTextEditorHandler;
        const currentStatusChanged =
          lastActiveEditor === undefined || lastActiveEditor.document.uri.fsPath.startsWith(statusNotification.projectPath);
        this.statusHandler.changeStatus(statusNotification, currentStatusChanged);
      }),

      this.client.onNotification('dbtWizard/installLatestDbtLog', async (data: string) => {
        this.outputChannelProvider.getInstallLatestDbtChannel().append(data);
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }),

      this.client.onNotification('dbtWizard/installDbtAdapterLog', async (data: string) => {
        this.outputChannelProvider.getInstallDbtAdaptersChannel().append(data);
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }),

      this.client.onNotification('dbtWizard/restart', async () => {
        await this.restart();
      }),
    );
  }

  initializeEvents(): void {
    this.disposables.push(
      this.client.onTelemetry((e: TelemetryEvent) => {
        if (e.name === 'error') {
          TelemetryClient.sendError(e.properties);
        } else {
          TelemetryClient.sendEvent(e.name, e.properties);
        }
      }),

      this.client.onDidChangeState(e => {
        log(`Client switched to state ${State[e.newState]}`);
      }),

      this.client.onProgress(WorkDoneProgress.type, 'Progress', v => this.progressHandler.onProgress(v)),
    );
  }

  getProjectUri(): Uri {
    return this.dbtProjectUri;
  }

  async initPythonParams(): Promise<void> {
    const customInitParams: CustomInitParams = {
      pythonInfo: await this.pythonExtension.getPythonInfo(this.client.clientOptions.workspaceFolder),
      dbtCompiler: workspace.getConfiguration('dbtWizard').get('dbtCompiler', 'Auto') as DbtCompilerType,
    };

    this.client.clientOptions.initializationOptions = customInitParams;
  }

  resendDiagnostics(uri: string): void {
    this.sendNotification('dbtWizard/resendDiagnostics', uri);
  }

  sendNotification(method: string, params?: unknown): void {
    if (this.client.state === State.Running) {
      this.client.sendNotification(method, params).catch(e => log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`));
    }
  }

  sendRequest<R>(method: string, param?: unknown): Promise<R> {
    return this.client.sendRequest(method, param);
  }

  start(): void {
    this.client.start().catch(e => log(`Error while starting server: ${e instanceof Error ? e.message : String(e)}`));
  }

  getDiagnostics(): DiagnosticCollection | undefined {
    return this.client.diagnostics;
  }

  async restart(): Promise<void> {
    await this.initPythonParams();
    this.statusHandler.onRestart(this.dbtProjectUri.fsPath);
    this.client.restart().catch(e => this.client.error('Restarting client failed', e, 'force'));
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
