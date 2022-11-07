import { InitializeError, InitializeParams, InitializeResult, ResponseError, _Connection } from 'vscode-languageserver';
import { FeatureFinder } from './FeatureFinder';
import { InstallUtils } from './InstallUtils';
import { NotificationSender } from './NotificationSender';

export abstract class LspServerBase {
  notificationSender: NotificationSender;

  constructor(protected connection: _Connection, protected featureFinder: FeatureFinder) {
    this.notificationSender = new NotificationSender(connection);
  }

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
    this.connection.onNotification('WizardForDbtCore(TM)/installLatestDbt', () => this.installLatestDbt());
    this.connection.onNotification('WizardForDbtCore(TM)/installDbtAdapter', (dbtAdapter: string) => this.installDbtAdapter(dbtAdapter));
  }

  async installLatestDbt(): Promise<void> {
    const pythonPath = this.featureFinder.getPythonPath();
    if (pythonPath) {
      const sendLog = (data: string): void => this.notificationSender.sendInstallLatestDbtLog(data);
      const installResult = await InstallUtils.installDbt(pythonPath, undefined, sendLog, sendLog);

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
