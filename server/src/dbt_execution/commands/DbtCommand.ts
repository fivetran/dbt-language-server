import { Command } from './Command';

/** dbt command that runs in terminal and uses python for if it is specified.  */
export class DbtCommand extends Command {
  constructor(profilesDir: string, parameters: string[], python?: string, dbtLess1point5?: boolean) {
    super('dbt', profilesDir, parameters, python, dbtLess1point5);
  }
}
