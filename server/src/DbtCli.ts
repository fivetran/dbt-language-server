import { PromiseWithChild } from 'child_process';
import { DbtCommand } from './dbt_commands/DbtCommand';
import { DbtCommandExecutor } from './dbt_commands/DbtCommandExecutor';

export class DbtCli {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();

  constructor(private python: string | undefined) {}

  compile(modelName?: string): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    const parameters = ['compile'];
    if (modelName) {
      parameters.push(...['-m', modelName]);
    }
    const compileCommand = new DbtCommand(parameters, this.python);
    return DbtCli.DBT_COMMAND_EXECUTOR.execute(compileCommand);
  }
}
