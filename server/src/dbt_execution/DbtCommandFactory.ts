import { DbtCommand } from './commands/DbtCommand';

export class DbtCommandFactory {
  static readonly VERSION_PARAM = '--version';

  constructor(private python: string, private profilesDir: string) {}

  getDbtWithPythonVersionOld(): DbtCommand {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], true, this.python);
  }

  getDbtWithPythonVersion(): DbtCommand {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], false, this.python);
  }

  private getDbtCommand(profilesDir: string, params: string[], dbtLess1point5: boolean, python: string): DbtCommand {
    return new DbtCommand(profilesDir, params, dbtLess1point5, python);
  }
}
