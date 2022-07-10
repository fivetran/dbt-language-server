import { _Connection } from 'vscode-languageserver';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRepository } from './DbtRepository';
import { DbtRpc } from './DbtRpc';
import { DbtRpcCompileJob } from './DbtRpcCompileJob';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { ProgressReporter } from './ProgressReporter';

export enum Mode {
  DBT_RPC,
  CLI,
}

export class Dbt {
  dbtRpc?: DbtRpc;

  constructor(
    public readonly mode: Mode,
    private featureFinder: FeatureFinder,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private fileChangeListener: FileChangeListener,
  ) {
    if (this.mode === Mode.DBT_RPC) {
      this.dbtRpc = new DbtRpc(this.featureFinder, this.connection, this.progressReporter, this.fileChangeListener);
    }
  }

  refreshServer(): void {
    this.dbtRpc?.refreshServer();
  }

  async isRpcReady(): Promise<void> {
    if (this.dbtRpc) {
      await this.dbtRpc.isRpcReady();
    }
  }

  async prepare(dbtProfileType?: string): Promise<void> {
    if (this.dbtRpc) {
      await this.dbtRpc.prepareRpcServer(dbtProfileType);
    }
  }

  async getStatus(): Promise<string | undefined> {
    return this.dbtRpc?.getStatus();
  }

  createCompileJob(modelPath: string, dbtRepository: DbtRepository, python?: string): DbtCompileJob {
    return this.dbtRpc
      ? new DbtRpcCompileJob(modelPath, dbtRepository, this.dbtRpc.dbtRpcClient)
      : new DbtCliCompileJob(modelPath, dbtRepository, python);
  }

  dispose(): void {
    this.dbtRpc?.dispose();
  }
}
