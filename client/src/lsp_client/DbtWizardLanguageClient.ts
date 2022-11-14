import { CustomInitParams, DbtCompilerType, LspModeType, StatusNotification } from 'dbt-language-server-common';
import { commands, Uri, workspace } from 'vscode';
import { Disposable, State } from 'vscode-languageclient';
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { log } from '../Logger';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { PythonExtension } from '../python/PythonExtension';
import { StatusHandler } from '../status/StatusHandler';

export abstract class DbtWizardLanguageClient implements Disposable {
  static readonly CLIENT_ID = 'WizardForDbtCore(TM)';
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

  constructor(protected outputChannelProvider: OutputChannelProvider, protected statusHandler: StatusHandler, protected dbtProjectUri: Uri) {}

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
        this.statusHandler.changeStatus(statusNotification);
      }),

      this.client.onNotification('WizardForDbtCore(TM)/installLatestDbtLog', async (data: string) => {
        this.outputChannelProvider.getInstallLatestDbtChannel().show();
        this.outputChannelProvider.getInstallLatestDbtChannel().append(data);
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }),

      this.client.onNotification('WizardForDbtCore(TM)/installDbtAdapterLog', async (data: string) => {
        this.outputChannelProvider.getInstallDbtAdaptersChannel().append(data);
        await commands.executeCommand('workbench.action.focusActiveEditorGroup');
      }),

      this.client.onNotification('WizardForDbtCore(TM)/restart', async () => {
        await this.restart();
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

  sendNotification(method: string, params?: unknown): void {
    if (this.client.state === State.Running) {
      this.client.sendNotification(method, params).catch(e => log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`));
    }
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
