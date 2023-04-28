import { Command } from './commands/Command';
import { DbtCommand } from './commands/DbtCommand';

export class DbtCommandFactory {
  static readonly VERSION_PARAM = '--version';

  constructor(private python: string | undefined, private profilesDir: string) {}

  getDbtWithPythonVersionOld(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], this.python, true);
  }

  getDbtWithPythonVersion(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], this.python);
  }

  getDbtGlobalVersion(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM]);
  }

  private getDbtCommand(profilesDir: string, params: string[], python?: string, dbtLess1point5?: boolean): Command {
    return new DbtCommand(profilesDir, params, python, dbtLess1point5);
  }
}
