import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { FeatureFinder } from '../FeatureFinder';
import { FileChangeListener } from '../FileChangeListener';
import { NotificationSender } from '../NotificationSender';
import { ProgressReporter } from '../ProgressReporter';
import { DbtCommand } from './commands/DbtCommand';
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

  createCompileJob(modelPath: string, dbtRepository: DbtRepository, allowFallback: boolean): DbtCompileJob {
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
      try {
        await this.startDbtRpc(command, dbtPort);
      } catch (e) {
        this.finishWithError(e instanceof Error ? e.message : `Failed to start dbt-rpc. ${String(e)}`);
      }
      this.doInitialCompile().catch(e => console.log(`Error while compiling project: ${e instanceof Error ? e.message : String(e)}`));
    }
  }

  async doInitialCompile(): Promise<void> {
    // Compilation can be started for a short time after the server receives a SIGHUP signal
    await this.dbtRpcServer.ensureCompilationFinished();

    const result = await this.dbtRpcClient.compile();
    console.log(
      result?.result.request_token !== undefined
        ? 'Initial compilation started successfully'
        : `There was an error while starting the compilation: ${result?.error?.data?.message ?? 'undefined'}`,
    );
  }

  async startDbtRpc(command: DbtCommand, port: number): Promise<void> {
    this.dbtRpcClient.setPort(port);
    await this.dbtRpcServer.startDbtRpc(command, this.dbtRpcClient);
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
