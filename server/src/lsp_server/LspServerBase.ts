import { DbtAdapter } from 'dbt-language-server-common';
import path from 'node:path';
import { InitializeError, InitializeParams, InitializeResult, ResponseError, _Connection } from 'vscode-languageserver';
import { InstallUtils } from '../InstallUtils';
import { NotificationSender } from '../NotificationSender';
import { FeatureFinderBase } from '../feature_finder/FeatureFinderBase';

export abstract class LspServerBase<T extends FeatureFinderBase> {
  constructor(
    protected connection: _Connection,
    protected notificationSender: NotificationSender,
    protected featureFinder: T,
  ) {}

  abstract onInitialize(params: InitializeParams): InitializeResult<unknown> | ResponseError<InitializeError>;

  onUncaughtException(error: Error, _origin: 'uncaughtException' | 'unhandledRejection'): void {
    const stack = LspServerBase.getCleanStackTrace(error.stack);
    console.log(stack);

    this.notificationSender.sendTelemetry('error', {
      name: error.name,
      message: error.message,
      stack,
      input: 'input' in error ? (error.input as string) : 'undefined',
    });

    throw new Error('Uncaught exception. Server will be restarted.');
  }

  private static getCleanStackTrace(stack: string | undefined): string {
    if (!stack) {
      return '';
    }

    let lines = stack.split('\n');
    lines = lines.map(line => {
      const match = line.match(/\((.*?dbt-language-server)/);
      return (match ? line.replace(match[1], '') : line).replaceAll(path.sep, '__');
    });

    return lines.join('\n');
  }

  initializeNotifications(): void {
    this.connection.onNotification('WizardForDbtCore(TM)/installDbtCore', (version: string) => this.installDbtCore(version));
    this.connection.onNotification('WizardForDbtCore(TM)/installDbtAdapter', (dbtAdapter: DbtAdapter) =>
      this.installDbtAdapter(dbtAdapter.name, dbtAdapter.version),
    );
    this.connection.onRequest('WizardForDbtCore(TM)/getDbtCoreInstallVersions', () => this.featureFinder.getDbtCoreInstallVersions());
    this.connection.onRequest('WizardForDbtCore(TM)/getDbtAdapterVersions', (adapterName: string) =>
      this.featureFinder.getDbtAdapterVersions(adapterName),
    );
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

  async installDbtAdapter(dbtAdapter: string, version?: string): Promise<void> {
    const pythonPath = this.featureFinder.getPythonPath();
    if (pythonPath) {
      const sendLog = (data: string): void => this.notificationSender.sendInstallDbtAdapterLog(data);
      const installResult = await InstallUtils.installDbtAdapter(pythonPath, dbtAdapter, version, sendLog, sendLog);

      if (installResult.isOk()) {
        this.notificationSender.sendRestart();
      }
    }
  }
}
