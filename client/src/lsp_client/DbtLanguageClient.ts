import { LspModeType, TelemetryEvent } from 'dbt-language-server-common';
import { EventEmitter } from 'node:events';
import {
  ConfigurationChangeEvent,
  Diagnostic,
  DiagnosticCollection,
  Disposable,
  RelativePattern,
  TextDocument,
  TextEditor,
  Uri,
  window,
  workspace,
} from 'vscode';
import { LanguageClient, LanguageClientOptions, State, WorkDoneProgress } from 'vscode-languageclient/node';
import { LS_MANIFEST_PARSED_EVENT } from '../ExtensionApi';
import { log } from '../Logger';
import { ModelProgressHandler } from '../ModelProgressHandler';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { ProjectProgressHandler } from '../ProjectProgressHandler';
import SqlPreviewContentProvider from '../SqlPreviewContentProvider';
import { TelemetryClient } from '../TelemetryClient';
import { DBT_PROJECT_YML, PACKAGES_YML, SUPPORTED_LANG_IDS } from '../Utils';
import { StatusHandler } from '../status/StatusHandler';
import { DbtWizardLanguageClient } from './DbtWizardLanguageClient';

export class DbtLanguageClient extends DbtWizardLanguageClient {
  pendingOpenRequests = new Map<string, (data: TextDocument) => Promise<void>>();
  projectProgressHandler = new ProjectProgressHandler();

  constructor(
    private port: number,
    outputChannelProvider: OutputChannelProvider,
    private serverAbsolutePath: string,
    dbtProjectUri: Uri,
    private previewContentProvider: SqlPreviewContentProvider,
    private modelProgressHandler: ModelProgressHandler,
    private manifestParsedEventEmitter: EventEmitter,
    statusHandler: StatusHandler,
  ) {
    super(outputChannelProvider, statusHandler, dbtProjectUri);
    window.onDidChangeVisibleTextEditors((e: readonly TextEditor[]) => this.onDidChangeVisibleTextEditors(e));
  }

  getLspMode(): LspModeType {
    return 'dbtProject';
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

  onDidChangeConfiguration(e: ConfigurationChangeEvent): void {
    if (e.affectsConfiguration('WizardForDbtCore(TM).profilesDir', this.client.clientOptions.workspaceFolder)) {
      this.restart().catch(e_ => log(`Error while restarting client ${e_ instanceof Error ? e_.message : String(e_)}`));
    }
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
          return Promise.resolve();
        },
        didClose: (data: TextDocument, next: (data: TextDocument) => Promise<void>): Promise<void> => {
          if (pendingOpenRequests.delete(data.uri.fsPath)) {
            log(`Open request cancelled for ${data.uri.fsPath}`);
            return Promise.resolve();
          }
          return next(data);
        },
      },
    };
    disposables.push(...fileEvents);
    return clientOptions;
  }

  override async initialize(): Promise<void> {
    await super.initialize();

    this.initializeEvents();
  }

  initializeClient(): LanguageClient {
    return new LanguageClient(
      DbtWizardLanguageClient.CLIENT_ID,
      DbtWizardLanguageClient.CLIENT_NAME,
      DbtWizardLanguageClient.createServerOptions(this.port, this.serverAbsolutePath),
      DbtLanguageClient.createClientOptions(this.port, this.dbtProjectUri, this.outputChannelProvider, this.disposables, this.pendingOpenRequests),
    );
  }

  override initializeNotifications(): void {
    super.initializeNotifications();

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

      this.client.onNotification('custom/clearAllDiagnostics', () => {
        this.client.diagnostics?.clear();
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
        log(`Client ${this.dbtProjectUri.fsPath} switched from ${State[e.oldState]} to ${State[e.newState]} state`);
      }),

      this.client.onProgress(WorkDoneProgress.type, 'Progress', v => this.modelProgressHandler.onProgress(v)),
      this.client.onProgress(WorkDoneProgress.type, 'Project_Progress', v => this.projectProgressHandler.onProgress(v)),
    );
  }

  getProjectUri(): Uri {
    return this.dbtProjectUri;
  }

  resendDiagnostics(uri: string): void {
    this.sendNotification('WizardForDbtCore(TM)/resendDiagnostics', uri);
  }

  sendRequest<R>(method: string, param?: unknown): Promise<R> {
    return this.client.sendRequest(method, param);
  }

  getDiagnostics(): DiagnosticCollection | undefined {
    return this.client.diagnostics;
  }
}
