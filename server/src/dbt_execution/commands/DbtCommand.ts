import { Command } from './Command';

/** dbt command that runs in terminal and uses python for if it is specified.  */
export class DbtCommand extends Command {
  constructor(profilesDir: string, parameters: string[], python?: string) {
    super('dbt', profilesDir, parameters, 'dbt.main', python);
  }
}
