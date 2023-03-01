import { Emitter, Event, _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { InstallUtils } from '../InstallUtils';
import { NotificationSender } from '../NotificationSender';
import { ProgressReporter } from '../ProgressReporter';
import { DbtCompileJob } from './DbtCompileJob';

export enum DbtMode {
  DBT_RPC,
  CLI,
}

export abstract class Dbt {
  dbtReady: boolean;
  onDbtReadyEmitter: Emitter<void>;

  constructor(protected connection: _Connection, protected progressReporter: ProgressReporter, protected notificationSender: NotificationSender) {
    this.dbtReady = false;
    this.onDbtReadyEmitter = new Emitter<void>();
  }

  abstract refresh(): void;

  async prepare(dbtProfileType?: string): Promise<void> {
    await this.prepareImplementation(dbtProfileType);
    this.dbtReady = true;
    this.onDbtReadyEmitter.fire();
  }

  protected abstract prepareImplementation(dbtProfileType?: string): Promise<void>;

  abstract compileProject(dbtRepository: DbtRepository): Promise<void>;

  abstract createCompileJob(modelPath: string, dbtRepository: DbtRepository, allowFallback: boolean): DbtCompileJob;

  abstract getError(): string;

  abstract deps(): Promise<void>;

  abstract dispose(): void;

  async suggestToInstallDbt(python: string, dbtProfileType: string): Promise<void> {
    const actions = { title: 'Install', id: 'install' };
    const errorMessageResult = await this.connection.window.showErrorMessage(
      `dbt/adapters are not installed. Would you like to install dbt and ${dbtProfileType} adapter?`,
      actions,
    );

    if (errorMessageResult?.id === 'install') {
      console.log(`Trying to install dbt, and ${dbtProfileType} adapter`);
      const sendLog = (data: string): void => this.notificationSender.sendInstallLatestDbtLog(data);
      const installResult = await InstallUtils.installDbt(python, dbtProfileType, sendLog, sendLog);
      if (installResult.isOk()) {
        this.notificationSender.sendRestart();
      } else {
        this.finishWithError(installResult.error);
      }
    } else {
      this.onRpcServerFindFailed();
    }
  }

  finishWithError(message: string): void {
    this.progressReporter.sendFinish();
    this.connection.window.showErrorMessage(message);
  }

  getInstallError(command: string, pythonInstallCommand: string): string {
    return `Failed to find ${command}. You can use '${pythonInstallCommand}' command to install it. Check in Terminal that ${command} works running '${command} --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. ~/dbt-env/bin/python3).`;
  }

  get onDbtReady(): Event<void> {
    return this.onDbtReadyEmitter.event;
  }

  onRpcServerFindFailed(): void {
    this.finishWithError(this.getError());
  }
}
