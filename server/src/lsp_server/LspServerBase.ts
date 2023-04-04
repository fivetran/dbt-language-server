import { InitializeError, InitializeParams, InitializeResult, ResponseError, _Connection } from 'vscode-languageserver';
import { InstallUtils } from '../InstallUtils';
import { NotificationSender } from '../NotificationSender';
import { FeatureFinderBase } from '../feature_finder/FeatureFinderBase';

export abstract class LspServerBase<T extends FeatureFinderBase> {
  constructor(protected connection: _Connection, protected notificationSender: NotificationSender, protected featureFinder: T) {}

  abstract onInitialize(params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError>;

  onUncaughtException(error: Error, _origin: 'uncaughtException' | 'unhandledRejection'): void {
    console.log(error.stack);

    this.notificationSender.sendTelemetry('error', {
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
    });

    throw new Error('Uncaught exception. Server will be restarted.');
  }

  initializeNotifications(): void {
    this.connection.onNotification('WizardForDbtCore(TM)/installDbtCore', (version: string) => this.installDbtCore(version));
    this.connection.onNotification('WizardForDbtCore(TM)/installDbtAdapter', (dbtAdapter: string) => this.installDbtAdapter(dbtAdapter));
    this.connection.onRequest('WizardForDbtCore(TM)/getDbtCoreInstallVersions', () => this.featureFinder.getDbtCoreInstallVersions());
  }

  async installDbtCore(version: string): Promise<void> {
    const pythonPath = this.featureFinder.getPythonPath();
    if (pythonPath) {
      const sendLog = (data: string): void => this.notificationSender.sendInstallDbtCoreLog(data);
      const installResult = await InstallUtils.installDbt(pythonPath, version, undefined, sendLog, sendLog);

      if (installResult.isOk()) {
        this.notificationSender.sendRestart();
      }
    }
  }

  async installDbtAdapter(dbtAdapter: string): Promise<void> {
    const pythonPath = this.featureFinder.getPythonPath();
    if (pythonPath) {
      const sendLog = (data: string): void => this.notificationSender.sendInstallDbtAdapterLog(data);
      const installResult = await InstallUtils.installDbtAdapter(pythonPath, dbtAdapter, sendLog, sendLog);

      if (installResult.isOk()) {
        this.notificationSender.sendRestart();
      }
    }
  }
}
