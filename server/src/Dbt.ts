import { _Connection } from 'vscode-languageserver';
import { DbtCli } from './DbtCli';
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
  dbtCli?: DbtCli;

  constructor(
    public readonly mode: Mode,
    private featureFinder: FeatureFinder,
    private connection: _Connection,
    private progressReporter: ProgressReporter,
    private fileChangeListener: FileChangeListener,
  ) {
    if (this.mode === Mode.DBT_RPC) {
      this.dbtRpc = new DbtRpc(this.featureFinder, this.connection, this.progressReporter, this.fileChangeListener);
    } else {
      this.dbtCli = new DbtCli(this.featureFinder.python);
    }
  }

  refreshServer(): void {
    this.dbtRpc?.refreshServer();
  }

  async isReady(): Promise<void> {
    if (this.dbtRpc) {
      await this.dbtRpc.isRpcReady();
    }
  }

  doInitialCompile(): void {
    this.dbtRpc?.doInitialCompile();
    this.dbtCli?.compile().catch(e => {
      console.log(`Error while compiling project. ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  async prepare(dbtProfileType?: string): Promise<void> {
    if (this.dbtRpc) {
      if (await this.dbtRpc.prepareRpcServer(dbtProfileType)) {
        this.doInitialCompile();
      }
      return;
    } else if (await this.featureFinder.findGlobalDbtCommand(dbtProfileType)) {
      this.featureFinder.python = undefined;
    }
    this.doInitialCompile();
  }

  async getStatus(): Promise<string | undefined> {
    return this.dbtRpc?.getStatus();
  }

  createCompileJob(modelPath: string, dbtRepository: DbtRepository): DbtCompileJob {
    if (this.dbtRpc) {
      return new DbtRpcCompileJob(modelPath, dbtRepository, this.dbtRpc.dbtRpcClient);
    } else if (this.dbtCli) {
      return new DbtCliCompileJob(modelPath, dbtRepository, this.dbtCli);
    }
    throw new Error('Either dbt-rpc or dbt CLI must exist.');
  }

  dispose(): void {
    this.dbtRpc?.dispose();
  }
}
