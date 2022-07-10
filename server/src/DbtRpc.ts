import { _Connection } from 'vscode-languageserver';
import { DbtRpcClient } from './DbtRpcClient';
import { DbtRpcServer } from './DbtRpcServer';
import { DbtUtilitiesInstaller } from './DbtUtilitiesInstaller';
import { DbtCommand } from './dbt_commands/DbtCommand';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { ProgressReporter } from './ProgressReporter';

export class DbtRpc {
  dbtRpcServer = new DbtRpcServer();
  dbtRpcClient = new DbtRpcClient();

  constructor(
    private featureFinder: FeatureFinder,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private fileChangeListener: FileChangeListener,
  ) {
    this.fileChangeListener.onDbtProjectYmlChanged(() => this.refreshServer());
    this.fileChangeListener.onDbtPackagesYmlChanged(() => this.refreshServer());
    this.fileChangeListener.onDbtPackagesChanged(() => this.refreshServer());
  }

  /** @returns undefined when ready and string error otherwise */
  async getStatus(): Promise<string | undefined> {
    const status = await this.dbtRpcClient.getStatus();
    return status?.error?.data?.message;
  }

  refreshServer(): void {
    this.dbtRpcServer.refreshServer();
  }

  async prepareRpcServer(dbtProfileType?: string): Promise<void> {
    const [command, dbtPort] = await Promise.all([this.featureFinder.findDbtRpcCommand(dbtProfileType), this.featureFinder.findFreePort()]);

    if (command === undefined) {
      try {
        if (dbtProfileType) {
          if (this.featureFinder.python) {
            await this.suggestToInstallDbt(this.featureFinder.python, dbtProfileType);
          }
        } else {
          this.onRpcServerFindFailed();
        }
      } catch (e) {
        this.onRpcServerFindFailed();
      }
    } else {
      this.featureFinder.python = command.python;
      command.addParameter(dbtPort.toString());
      try {
        await this.startDbtRpc(command, dbtPort);
      } catch (e) {
        this.finishWithError(e instanceof Error ? e.message : `Failed to start dbt-rpc. ${String(e)}`);
      }
      this.doInitialCompile();
    }
  }

  doInitialCompile(): void {
    this.dbtRpcClient.compile().catch(e => {
      console.log(`Error while compiling project. ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  async isRpcReady(): Promise<void> {
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
        await this.prepareRpcServer(dbtProfileType);
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
