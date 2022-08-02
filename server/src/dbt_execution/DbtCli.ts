import { PromiseWithChild } from 'child_process';
import { deferred } from 'dbt-language-server-common';
import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { FeatureFinder } from '../FeatureFinder';
import { ProgressReporter } from '../ProgressReporter';
import { DbtCommand } from './commands/DbtCommand';
import { DbtCommandExecutor } from './commands/DbtCommandExecutor';
import { Dbt } from './Dbt';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';

export class DbtCli extends Dbt {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();

  readyDeferred = deferred<void>();

  constructor(private featureFinder: FeatureFinder, connection: _Connection, progressReporter: ProgressReporter) {
    super(connection, progressReporter);
  }

  compile(modelName?: string): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    const parameters = ['compile'];
    if (modelName) {
      parameters.push(...['-m', modelName]);
    }
    const compileCliCommand = new DbtCommand(parameters, this.featureFinder.getPythonPath());
    return DbtCli.DBT_COMMAND_EXECUTOR.execute(compileCliCommand);
  }

  async prepare(dbtProfileType?: string | undefined): Promise<void> {
    const globalFound = await this.featureFinder.findGlobalDbtCommand(dbtProfileType);
    if (globalFound) {
      this.featureFinder.pythonInfo = undefined;
    }

    if (!this.featureFinder.versionInfo?.installedVersion || !this.featureFinder.versionInfo.installedAdapter) {
      try {
        if (dbtProfileType && this.featureFinder.pythonInfo) {
          await this.suggestToInstallDbt(this.featureFinder.pythonInfo.path, dbtProfileType);
        } else {
          this.onRpcServerFindFailed();
        }
      } catch (e) {
        this.onRpcServerFindFailed();
      }
    }

    this.readyDeferred.resolve();

    this.compile().catch(e => {
      console.log(`Error while compiling project. ${e instanceof Error ? e.message : String(e)}`);
    });
  }

  getStatus(): Promise<string | undefined> {
    return Promise.resolve(undefined);
  }

  createCompileJob(modelPath: string, dbtRepository: DbtRepository): DbtCompileJob {
    return new DbtCliCompileJob(modelPath, dbtRepository, this);
  }

  refresh(): void {
    // Nothing to refresh
  }

  isReady(): Promise<void> {
    return this.readyDeferred.promise;
  }

  getError(): string {
    return this.getInstallError('dbt', 'python3 -m pip install dbt-bigquery');
  }

  dispose(): void {
    // Nothing to dispose
  }
}
