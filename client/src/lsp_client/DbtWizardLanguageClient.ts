import { CustomInitParams, LspModeType, PythonInfo, StatusNotification } from 'dbt-language-server-common';
import { Uri, commands, workspace } from 'vscode';
import { Disposable, State } from 'vscode-languageclient';
import { LanguageClient, ServerOptions, TransportKind } from 'vscode-languageclient/node';
import { log } from '../Logger';
import { OutputChannelProvider } from '../OutputChannelProvider';
import { PythonExtension } from '../python/PythonExtension';
import { StatusHandler } from '../status/StatusHandler';

export abstract class DbtWizardLanguageClient implements Disposable {
  static readonly CLIENT_ID = 'WizardForDbtCore(TM)';
  static readonly CLIENT_NAME = 'Wizard for dbt Core (TM)';
  static readonly FOCUS_EDITOR_COMMAND = 'workbench.action.focusActiveEditorGroup';

  pythonInfo?: PythonInfo;

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
    this.initializeNotifications();
  }

  initializeNotifications(): void {
    this.disposables.push(
      this.client.onNotification('WizardForDbtCore(TM)/status', (statusNotification: StatusNotification) => {
        this.statusHandler.changeStatus(statusNotification);
      }),

      this.client.onNotification('WizardForDbtCore(TM)/installDbtCoreLog', async (data: string) => {
        this.outputChannelProvider.getInstallDbtCoreChannel().show();
        this.outputChannelProvider.getInstallDbtCoreChannel().append(data);
        await commands.executeCommand(DbtWizardLanguageClient.FOCUS_EDITOR_COMMAND);
      }),

      this.client.onNotification('WizardForDbtCore(TM)/installDbtAdapterLog', async (data: string) => {
        this.outputChannelProvider.getInstallDbtAdaptersChannel().append(data);
        await commands.executeCommand(DbtWizardLanguageClient.FOCUS_EDITOR_COMMAND);
      }),

      this.client.onNotification('WizardForDbtCore(TM)/dbtDepsLog', async (data: string) => {
        this.outputChannelProvider.getDbtDepsChannel().append(data);
        await commands.executeCommand(DbtWizardLanguageClient.FOCUS_EDITOR_COMMAND);
      }),

      this.client.onNotification('WizardForDbtCore(TM)/restart', async () => {
        await this.restart();
      }),
    );
  }

  async initCustomParams(): Promise<void> {
    const configuration = workspace.getConfiguration('WizardForDbtCore(TM)', this.client.clientOptions.workspaceFolder);
    this.pythonInfo = await this.pythonExtension.getPythonInfo(this.client.clientOptions.workspaceFolder);
    const customInitParams: CustomInitParams = {
      pythonInfo: this.pythonInfo,
      enableEntireProjectAnalysis: configuration.get<boolean>('enableEntireProjectAnalysis', true),
      enableSnowflakeSyntaxCheck: configuration.get<boolean>('enableSnowflakeSyntaxCheck', false),
      lspMode: this.getLspMode(),
      profilesDir: configuration.get<string | undefined>('profilesDir', undefined),
    };

    this.client.clientOptions.initializationOptions = customInitParams;
  }

  async start(): Promise<void> {
    await this.client.start().catch(e => log(`Error while starting server: ${e instanceof Error ? e.message : String(e)}`));
    (await this.pythonExtension.onDidChangeExecutionDetails())(async (resource: Uri | undefined) => {
      log(`onDidChangeExecutionDetails ${resource?.fsPath ?? 'undefined'}`);
      if (this.client.state === State.Running && this.dbtProjectUri.fsPath === resource?.fsPath) {
        const newPythonInfo = await this.pythonExtension.getPythonInfo(this.client.clientOptions.workspaceFolder);
        if (newPythonInfo.path !== this.pythonInfo?.path || newPythonInfo.version?.join('.') !== this.pythonInfo.version?.join('.')) {
          log(`Python info changed: ${JSON.stringify(newPythonInfo)}`);
          await this.restart();
        }
      }
    });
  }

  stop(): Promise<void> {
    log(`Stop client ${this.dbtProjectUri.fsPath}`);
    return this.client.stop();
  }

  sendNotification(method: string, params?: unknown): void {
    if (this.client.state === State.Running) {
      this.client.sendNotification(method, params).catch(e => log(`Error while sending notification: ${e instanceof Error ? e.message : String(e)}`));
    }
  }

  sendRequest<R>(method: string, param?: unknown): Promise<R> {
    return this.client.sendRequest(method, param);
  }

  async restart(): Promise<void> {
    log(`Restart client ${this.dbtProjectUri.fsPath}`);
    await this.initCustomParams();
    this.statusHandler.onRestart(this.dbtProjectUri.fsPath);
    this.client.restart().catch(e => this.client.error('Restarting client failed', e, 'force'));
  }

  dispose(): void {
    log(`Dispose client ${this.dbtProjectUri.fsPath}`);
    this.disposables.forEach(disposable => {
      disposable.dispose();
    });
  }
}
