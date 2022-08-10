import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { FeatureFinder } from '../FeatureFinder';
import { FileChangeListener } from '../FileChangeListener';
import { ProgressReporter } from '../ProgressReporter';
import { DbtCommand } from './commands/DbtCommand';
import { Dbt } from './Dbt';
import { DbtCompileJob } from './DbtCompileJob';
import { CompileResponse, DbtRpcClient } from './DbtRpcClient';
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
  ) {
    super(connection, progressReporter);
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

  async prepareImplementation(dbtProfileType?: string): Promise<void> {
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
      command.addParameter(dbtPort.toString());
      try {
        await this.startDbtRpc(command, dbtPort);
      } catch (e) {
        this.finishWithError(e instanceof Error ? e.message : `Failed to start dbt-rpc. ${String(e)}`);
      }

      // We need to wait for initial compile to be finished.
      // Compilation of some model with '--select' key may
      // not compile models from which compiled one is dependant.
      // Despite awaiting of initial compile it does not block
      // dbt completions and definitions provisioning.
      await this.doInitialCompile();
    }
  }

  async doInitialCompile(): Promise<void> {
    let compileResponse: CompileResponse | undefined = undefined;
    try {
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

  async startDbtRpc(command: DbtCommand, port: number): Promise<void> {
    this.dbtRpcClient.setPort(port);
    await this.dbtRpcServer.startDbtRpc(command, this.dbtRpcClient);
    this.progressReporter.sendFinish();
  }

  getError(): string {
    return this.getInstallError('dbt-rpc', 'python3 -m pip install dbt-bigquery dbt-rpc');
  }

  dispose(): void {
    this.dbtRpcServer.dispose();
  }
}
