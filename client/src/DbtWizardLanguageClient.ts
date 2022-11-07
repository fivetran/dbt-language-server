import { CustomInitParams, DbtCompilerType, LspModeType, StatusNotification } from 'dbt-language-server-common';
import { Uri, workspace } from 'vscode';
import { Disposable } from 'vscode-languageclient';
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { ActiveTextEditorHandler } from './ActiveTextEditorHandler';
import { log } from './Logger';
import { PythonExtension } from './python/PythonExtension';
import { StatusHandler } from './status/StatusHandler';

export abstract class DbtWizardLanguageClient implements Disposable {
  static readonly CLIENT_ID = 'dbtWizard';
  static readonly CLIENT_NAME = 'Wizard for dbt Core (TM)';

  static createServerOptions(port: number, module: string): ServerOptions {
    const debugOptions = { execArgv: ['--nolazy', `--inspect=${port}`] };
    return {
      run: { module, transport: TransportKind.ipc },
      debug: { module, transport: TransportKind.ipc, options: debugOptions },
    };
  }

  protected disposables: Disposable[] = [];
  protected pythonExtension = new PythonExtension();
  protected client!: LanguageClient;

  constructor(protected statusHandler: StatusHandler, protected dbtProjectUri: Uri) {}

  abstract getLspMode(): LspModeType;
  abstract initializeClient(): LanguageClient;

  async initialize(): Promise<void> {
    this.client = this.initializeClient();
    await this.initCustomParams();
    (await this.pythonExtension.onDidChangeExecutionDetails())(() => this.restart());
    this.initializeNotifications();
  }

  initializeNotifications(): void {
    this.disposables.push(
      this.client.onNotification('WizardForDbtCore(TM)/status', (statusNotification: StatusNotification) => {
        const { lastActiveEditor } = ActiveTextEditorHandler;
        const currentStatusChanged =
          lastActiveEditor === undefined || lastActiveEditor.document.uri.fsPath.startsWith(statusNotification.projectPath);
        this.statusHandler.changeStatus(statusNotification, currentStatusChanged);
      }),
    );
  }

  async initCustomParams(): Promise<void> {
    const customInitParams: CustomInitParams = {
      pythonInfo: await this.pythonExtension.getPythonInfo(this.client.clientOptions.workspaceFolder),
      dbtCompiler: workspace.getConfiguration('WizardForDbtCore(TM)').get('dbtCompiler', 'Auto') as DbtCompilerType,
      lspMode: this.getLspMode(),
    };

    this.client.clientOptions.initializationOptions = customInitParams;
  }

  start(): void {
    this.client.start().catch(e => log(`Error while starting server: ${e instanceof Error ? e.message : String(e)}`));
  }

  stop(): Promise<void> {
    return this.client.stop();
  }

  async restart(): Promise<void> {
    await this.initCustomParams();
    this.statusHandler.onRestart(this.dbtProjectUri.fsPath);
    this.client.restart().catch(e => this.client.error('Restarting client failed', e, 'force'));
  }

  dispose(): void {
    this.disposables.forEach(disposable => {
      disposable.dispose();
    });
  }
}
