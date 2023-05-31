import { Result } from 'neverthrow';
import { Emitter, Event, _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { InstallUtils } from '../InstallUtils';
import { ModelProgressReporter } from '../ModelProgressReporter';
import { NotificationSender } from '../NotificationSender';
import { DbtCompileJob } from './DbtCompileJob';

export abstract class Dbt {
  dbtReady: boolean;
  onDbtReadyEmitter: Emitter<void>;

  constructor(
    protected connection: _Connection,
    protected modelProgressReporter: ModelProgressReporter,
    protected notificationSender: NotificationSender,
  ) {
    this.dbtReady = false;
    this.onDbtReadyEmitter = new Emitter<void>();
  }

  async prepare(dbtProfileType?: string): Promise<void> {
    await this.prepareImplementation(dbtProfileType);
    this.dbtReady = true;
    this.onDbtReadyEmitter.fire();
  }

  protected abstract prepareImplementation(dbtProfileType?: string): Promise<void>;

  abstract compileProject(dbtRepository: DbtRepository): Promise<Result<void, string>>;

  abstract createCompileJob(modelPath: string, dbtRepository: DbtRepository, allowFallback: boolean): DbtCompileJob;

  abstract getError(): string;

  abstract deps(onStdoutData: (data: string) => void, onStderrData: (data: string) => void): Promise<void>;

  async suggestToInstallDbt(python: string, dbtProfileType: string): Promise<void> {
    const actions = { title: 'Install', id: 'install' };
    const errorMessageResult = await this.connection.window.showErrorMessage(
      `dbt/adapters are not installed. You can specify [python environment](command:python.setInterpreter) that contains dbt with needed adapter. Otherwise you can install dbt and ${dbtProfileType} adapter by pressing Install button.`,
      actions,
    );

    if (errorMessageResult?.id === 'install') {
      console.log(`Trying to install dbt, and ${dbtProfileType} adapter`);
      const sendLog = (data: string): void => this.notificationSender.sendInstallDbtCoreLog(data);
      const installResult = await InstallUtils.installDbt(python, undefined, dbtProfileType, sendLog, sendLog);
      if (installResult.isOk()) {
        this.notificationSender.sendRestart();
      } else {
        this.finishWithError(installResult.error);
      }
    } else {
      this.onDbtFindFailed();
    }
  }

  finishWithError(message: string): void {
    this.modelProgressReporter.sendFinish();
    this.connection.window.showErrorMessage(message);
  }

  getInstallError(command: string, pythonInstallCommand: string): string {
    return `Failed to find ${command}. You can use '${pythonInstallCommand}' command to install it. Check in Terminal that ${command} works running '${command} --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. ~/dbt-env/bin/python3).`;
  }

  get onDbtReady(): Event<void> {
    return this.onDbtReadyEmitter.event;
  }

  onDbtFindFailed(): void {
    this.finishWithError(this.getError());
  }
}
