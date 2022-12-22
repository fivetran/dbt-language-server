import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { FileChangeListener } from '../FileChangeListener';
import { NotificationSender } from '../NotificationSender';
import { ProgressReporter } from '../ProgressReporter';
import { Dbt } from './Dbt';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRpcClient } from './DbtRpcClient';
import { DbtRpcCompileJob } from './DbtRpcCompileJob';
import { DbtRpcServer } from './DbtRpcServer';

export class DbtRpc extends Dbt {
  dbtRpcServer = new DbtRpcServer();
  dbtRpcClient = new DbtRpcClient();

  constructor(
    private featureFinder: FeatureFinder,
    connection: _Connection,
    progressReporter: ProgressReporter,
    private fileChangeListener: FileChangeListener,
    notificationSender: NotificationSender,
  ) {
    super(connection, progressReporter, notificationSender);
    this.fileChangeListener.onDbtProjectYmlChanged(() => this.refresh());
    this.fileChangeListener.onDbtPackagesYmlChanged(() => this.refresh());
    this.fileChangeListener.onDbtPackagesChanged(() => this.refresh());
  }

  createCompileJob(modelPath: string | undefined, dbtRepository: DbtRepository, allowFallback: boolean): DbtCompileJob {
    return new DbtRpcCompileJob(modelPath, dbtRepository, allowFallback, this.dbtRpcClient);
  }

  refresh(): void {
    this.dbtRpcServer.refresh();
  }

  async prepareImplementation(dbtProfileType?: string): Promise<void> {
    const [command, dbtPort] = await Promise.all([this.featureFinder.findDbtRpcCommand(dbtProfileType), this.featureFinder.findFreePort()]);

    if (command === undefined) {
      try {
        if (dbtProfileType && this.featureFinder.pythonInfo) {
          await this.suggestToInstallDbt(this.featureFinder.pythonInfo.path, dbtProfileType);
        } else {
          this.onRpcServerFindFailed();
        }
      } catch {
        this.onRpcServerFindFailed();
      }
    } else {
      command.addParameter(dbtPort.toString());
      this.dbtRpcClient.setPort(dbtPort);
      try {
        await this.dbtRpcServer.startDbtRpc(command, this.dbtRpcClient);
      } catch (e) {
        if (this.featureFinder.pythonInfo) {
          await this.suggestToUpdateDbtRpc(
            e instanceof Error ? e.message : `Failed to start dbt-rpc. ${String(e)}`,
            this.featureFinder.pythonInfo.path,
          );
        }
      }
    }
  }

  async compileProject(dbtRepository: DbtRepository): Promise<void> {
    // Compilation can be started for a short time after the server receives a SIGHUP signal
    await this.dbtRpcServer.ensureCompilationFinished();

    const job = this.createCompileJob(undefined, dbtRepository, false);
    console.log('Starting project compilation');
    const result = await job.start();

    if (result.isOk()) {
      console.log('Project compiled successfully');
    } else {
      console.log(`There was an error while project compilation: ${result.error}`);
    }
  }

  getError(): string {
    return this.getInstallError('dbt-rpc', 'python3 -m pip install dbt-bigquery dbt-rpc');
  }

  async deps(): Promise<void> {
    try {
      await this.dbtRpcServer.ensureCompilationFinished();
    } catch {
      // Compilation finished with error
    }
    await this.dbtRpcClient.deps();
  }

  dispose(): void {
    this.dbtRpcServer.dispose();
  }
}
