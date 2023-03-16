import { Command } from './commands/Command';
import { DbtCommand } from './commands/DbtCommand';
import { DbtRpcCommand } from './commands/DbtRpcCommand';

export class DbtCommandFactory {
  static readonly VERSION_PARAM = '--version';
  private static readonly NO_VERSION_CHECK_PARAM = '--no-version-check';
  private static readonly PARTIAL_PARSE_PARAM = '--partial-parse';
  private static readonly PORT_PARAM = '--port';
  private static readonly LEGACY_DBT_PARAMS = [
    `${DbtCommandFactory.PARTIAL_PARSE_PARAM}`,
    'rpc',
    `${DbtCommandFactory.NO_VERSION_CHECK_PARAM}`,
    `${DbtCommandFactory.PORT_PARAM}`,
  ];
  private static readonly DBT_RPC_PARAMS = [
    `${DbtCommandFactory.PARTIAL_PARSE_PARAM}`,
    `${DbtCommandFactory.NO_VERSION_CHECK_PARAM}`,
    '--no-anonymous-usage-stats',
    'serve',
    `${DbtCommandFactory.PORT_PARAM}`,
  ];

  constructor(private python: string | undefined, private profilesDir: string) {}

  getDbtRpcWithPythonVersion(): Command {
    return this.getDbtRpcCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], this.python);
  }

  getDbtRpcGlobalVersion(): Command {
    return this.getDbtRpcCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM]);
  }

  getDbtRpcRun(): Command {
    return this.getDbtRpcCommand(this.profilesDir, DbtCommandFactory.DBT_RPC_PARAMS, this.python);
  }

  getGlobalDbtRpcRun(): Command {
    return this.getDbtRpcCommand(this.profilesDir, DbtCommandFactory.DBT_RPC_PARAMS);
  }

  getDbtWithPythonVersion(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM], this.python);
  }

  getDbtGlobalVersion(): Command {
    return this.getDbtCommand(this.profilesDir, [DbtCommandFactory.VERSION_PARAM]);
  }

  getLegacyDbtRpcRun(): Command {
    return this.getDbtCommand(this.profilesDir, DbtCommandFactory.LEGACY_DBT_PARAMS, this.python);
  }

  private getDbtRpcCommand(profilesDir: string, params: string[], python?: string): Command {
    return new DbtRpcCommand(profilesDir, params, python);
  }

  private getDbtCommand(profilesDir: string, params: string[], python?: string): Command {
    return new DbtCommand(profilesDir, params, python);
  }
}
