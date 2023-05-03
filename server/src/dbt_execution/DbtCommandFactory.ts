import { Command } from './commands/Command';
import { DbtCommand } from './commands/DbtCommand';

export class DbtCommandFactory {
  static readonly VERSION_PARAM = '--version';

  constructor(private python: string | undefined, private profilesDir: string) {}

  getDbtWithPythonVersionOld(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], true, this.python);
  }

  getDbtWithPythonVersion(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], false, this.python);
  }

  getDbtGlobalVersion(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], false);
  }

  private getDbtCommand(profilesDir: string, params: string[], dbtLess1point5: boolean, python?: string): Command {
    return new DbtCommand(profilesDir, params, dbtLess1point5, python);
  }
}
