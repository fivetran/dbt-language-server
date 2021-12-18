import { Command } from './Command';

export class DbtCommand extends Command {
  constructor(parameters: string[], python?: string) {
    super('dbt', parameters, 'dbt.main', python);
  }
}
