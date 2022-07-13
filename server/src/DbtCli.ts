import { PromiseWithChild } from 'child_process';
import { Dbt } from './Dbt';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRepository } from './DbtRepository';
import { DbtCommand } from './dbt_commands/DbtCommand';
import { DbtCommandExecutor } from './dbt_commands/DbtCommandExecutor';
import { FeatureFinder } from './FeatureFinder';

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
    const compileCommand = new DbtCommand(parameters, this.featureFinder.python);
    return DbtCli.DBT_COMMAND_EXECUTOR.execute(compileCommand);
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
