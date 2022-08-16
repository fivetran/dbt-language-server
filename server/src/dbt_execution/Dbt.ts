import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DbtUtilitiesInstaller } from '../DbtUtilitiesInstaller';
import { ProgressReporter } from '../ProgressReporter';
import { DbtCompileJob } from './DbtCompileJob';

export enum DbtMode {
  DBT_RPC,
  CLI,
}

export abstract class Dbt {
  constructor(private connection: _Connection, protected progressReporter: ProgressReporter) {}

  abstract refresh(): void;

  abstract isReady(): Promise<void>;

  abstract prepare(dbtProfileType?: string): Promise<void>;

  abstract createCompileJob(modelPath: string, dbtRepository: DbtRepository): DbtCompileJob;

  abstract getError(): string;

  abstract dispose(): void;

  async suggestToInstallDbt(python: string, dbtProfileType: string): Promise<void> {
    const actions = { title: 'Install', id: 'install' };
    const errorMessageResult = await this.connection.window.showErrorMessage(
      `dbt is not installed. Would you like to install dbt, dbt-rpc and ${dbtProfileType} adapter?`,
      actions,
    );

    if (errorMessageResult?.id === 'install') {
      console.log(`Trying to install dbt, dbt-rpc and ${dbtProfileType} adapter`);
      const installResult = await DbtUtilitiesInstaller.installDbt(python, dbtProfileType);
      if (installResult.isOk()) {
        this.connection.window.showInformationMessage(installResult.value);
        await this.prepare(dbtProfileType);
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

  onRpcServerFindFailed(): void {
    this.finishWithError(this.getError());
  }
}
