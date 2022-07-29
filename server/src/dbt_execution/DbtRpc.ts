import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { DbtUtilitiesInstaller } from '../DbtUtilitiesInstaller';
import { FeatureFinder } from '../FeatureFinder';
import { FileChangeListener } from '../FileChangeListener';
import { ProgressReporter } from '../ProgressReporter';
import { DbtCommand } from './commands/DbtCommand';
import { Dbt } from './Dbt';
import { DbtCompileJob } from './DbtCompileJob';
import { CompileResponse, DbtRpcClient } from './DbtRpcClient';
import { DbtRpcCompileJob } from './DbtRpcCompileJob';
import { DbtRpcServer } from './DbtRpcServer';

export class DbtRpc implements Dbt {
  dbtRpcServer = new DbtRpcServer();
  dbtRpcClient = new DbtRpcClient();

  constructor(
    private featureFinder: FeatureFinder,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private fileChangeListener: FileChangeListener,
  ) {
    this.fileChangeListener.onDbtProjectYmlChanged(() => this.refresh());
    this.fileChangeListener.onDbtPackagesYmlChanged(() => this.refresh());
    this.fileChangeListener.onDbtPackagesChanged(() => this.refresh());
  }

  createCompileJob(modelPath: string, dbtRepository: DbtRepository): DbtCompileJob {
    return new DbtRpcCompileJob(modelPath, dbtRepository, this.dbtRpcClient);
  }

  async getStatus(): Promise<string | undefined> {
    const status = await this.dbtRpcClient.getStatus();
    return status?.error?.data?.message;
  }

  refresh(): void {
    this.dbtRpcServer.refresh();
  }

  async prepare(dbtProfileType?: string): Promise<void> {
    const [command, dbtPort] = await Promise.all([this.featureFinder.findDbtRpcCommand(dbtProfileType), this.featureFinder.findFreePort()]);

    if (command === undefined) {
      try {
        if (dbtProfileType && this.featureFinder.pythonInfo) {
          await this.suggestToInstallDbt(this.featureFinder.pythonInfo.path, dbtProfileType);
        } else {
          this.onRpcServerFindFailed();
        }
      } catch (e) {
        this.onRpcServerFindFailed();
      }
    } else {
      if (!command.python) {
        this.featureFinder.pythonInfo = undefined;
      }
      command.addParameter(dbtPort.toString());
      try {
        await this.startDbtRpc(command, dbtPort);
      } catch (e) {
        this.finishWithError(e instanceof Error ? e.message : `Failed to start dbt-rpc. ${String(e)}`);
      }

      // We need to wait for initial compile to be finished.
      // Compilation of some model with '--select' key may
      //  not compile models from which compiled one is dependant.
      await this.doInitialCompile();
    }
  }

  async doInitialCompile(): Promise<void> {
    let compileResponse: CompileResponse | undefined;
    try {
      // eslint-disable-next-line prefer-const
      compileResponse = await this.dbtRpcClient.compile();
    } catch (e) {
      console.log(`Error while compiling project. ${e instanceof Error ? e.message : String(e)}`);
      return;
    }

    if (!compileResponse || compileResponse.error) {
      console.log(`Error while compiling project. ${compileResponse?.error?.data?.message ?? 'unknown error'}`);
      return;
    }

    await this.dbtRpcClient.pollOnceCompileResult(compileResponse.result.request_token);
  }

  async isReady(): Promise<void> {
    return this.dbtRpcServer.startDeferred.promise;
  }

  async startDbtRpc(command: DbtCommand, port: number): Promise<void> {
    this.dbtRpcClient.setPort(port);
    await this.dbtRpcServer.startDbtRpc(command, this.dbtRpcClient);
    this.progressReporter.sendFinish();
  }

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

  onRpcServerFindFailed(): void {
    this.finishWithError(
      `Failed to find dbt-rpc. You can use 'python3 -m pip install dbt-bigquery dbt-rpc' command to install it. Check in Terminal that dbt-rpc works running 'dbt-rpc --version' command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. ~/dbt-env/bin/python3).`,
    );
  }

  finishWithError(message: string): void {
    this.progressReporter.sendFinish();
    this.connection.window.showErrorMessage(message);
  }

  dispose(): void {
    this.dbtRpcServer.dispose();
  }
}
