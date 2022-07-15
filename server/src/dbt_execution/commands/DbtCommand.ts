import { Command } from './Command';

/** dbt command that runs in terminal and uses python for if it is specified.  */
export class DbtCommand extends Command {
  constructor(parameters: string[], python?: string) {
    super('dbt', parameters, 'dbt.main', python);
  }
}
