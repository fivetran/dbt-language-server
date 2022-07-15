import { PromiseWithChild } from 'child_process';
import { DbtRepository } from '../DbtRepository';
import { FeatureFinder } from '../FeatureFinder';
import { DbtCommand } from './commands/DbtCommand';
import { DbtCommandExecutor } from './commands/DbtCommandExecutor';
import { Dbt } from './Dbt';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';

export class DbtCli implements Dbt {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();

  constructor(private featureFinder: FeatureFinder) {}

  compile(modelName?: string): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    const parameters = ['compile'];
    if (modelName) {
      parameters.push(...['-m', modelName]);
    }
    const compileCliCommand = new DbtCommand(parameters, this.featureFinder.python);
    return DbtCli.DBT_COMMAND_EXECUTOR.execute(compileCliCommand);
  }

  async prepare(dbtProfileType?: string | undefined): Promise<void> {
    if (await this.featureFinder.findGlobalDbtCommand(dbtProfileType)) {
      this.featureFinder.python = undefined;
    }

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
    return Promise.resolve();
  }

  dispose(): void {
    // Nothing to dispose
  }
}
