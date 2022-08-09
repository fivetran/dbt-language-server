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

  constructor(public python: string | undefined) {}

  getDbtRpcWithPythonVersion(): Command {
    return this.getDbtRpcCommand([DbtCommandFactory.VERSION_PARAM], this.python);
  }

  getDbtRpcGlobalVersion(): Command {
    return this.getDbtRpcCommand([DbtCommandFactory.VERSION_PARAM]);
  }

  getDbtRpcRun(): Command {
    return this.getDbtRpcCommand(DbtCommandFactory.DBT_RPC_PARAMS, this.python);
  }

  getGlobalDbtRpcRun(): Command {
    return this.getDbtRpcCommand(DbtCommandFactory.DBT_RPC_PARAMS);
  }

  getDbtWithPythonVersion(): Command {
    return this.getDbtCommand([DbtCommandFactory.VERSION_PARAM], this.python);
  }

  getDbtGlobalVersion(): Command {
    return this.getDbtCommand([DbtCommandFactory.VERSION_PARAM]);
  }

  getLegacyDbtRpcRun(): Command {
    return this.getDbtCommand(DbtCommandFactory.LEGACY_DBT_PARAMS, this.python);
  }

  private getDbtRpcCommand(params: string[], python?: string): Command {
    return new DbtRpcCommand(params, python);
  }

  private getDbtCommand(params: string[], python?: string): Command {
    return new DbtCommand(params, python);
  }
}
