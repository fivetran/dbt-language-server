import { DbtVersion, getStringVersion } from './DbtVersion';
import { Command } from './dbt_commands/Command';
import { DbtCommand } from './dbt_commands/DbtCommand';
import { DbtRpcCommand } from './dbt_commands/DbtRpcCommand';
import { ProcessExecutor } from './ProcessExecutor';
import { randomNumber } from './Utils';
import findFreePortPmfy = require('find-free-port');

export class FeatureFinder {
  private static readonly NO_VERSION_CHECK_PARAM = '--no-version-check';
  private static readonly PARTIAL_PARSE_PARAM = '--partial-parse';
  private static readonly PORT_PARAM = '--port';
  private static readonly VERSION_PARAM = '--version';
  private static readonly LEGACY_DBT_PARAMS = [
    `${FeatureFinder.PARTIAL_PARSE_PARAM}`,
    'rpc',
    `${FeatureFinder.NO_VERSION_CHECK_PARAM}`,
    `${FeatureFinder.PORT_PARAM}`,
  ];
  private static readonly DBT_RPC_PARAMS = [
    `${FeatureFinder.PARTIAL_PARSE_PARAM}`,
    `${FeatureFinder.NO_VERSION_CHECK_PARAM}`,
    '--no-anonymous-usage-stats',
    'serve',
    `${FeatureFinder.PORT_PARAM}`,
  ];

  private static readonly DBT_VERSION_PATTERN = /installed version: (\d+)\.(\d+)\.(\d+)/;
  private static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  private dbtRpcGlobal: Promise<DbtVersion | undefined>;
  private dbtGlobal: Promise<DbtVersion | undefined>;

  python?: string;
  version?: DbtVersion;

  constructor() {
    this.dbtRpcGlobal = this.findDbtRpcGlobalVersion();
    this.dbtGlobal = this.findDbtGlobalVersion();
  }

  /** Tries to find a suitable command to start the server first in the current Python environment and then in the global scope.
   * Installs dbt-rpc for dbt version > 1.0.0.
   * @returns {Command} or `undefined` if nothing is found
   */
  async findDbtRpcCommand(pythonPromise: Promise<string>): Promise<Command | undefined> {
    this.python = await pythonPromise;

    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion, dbtGlobalVersion] = await Promise.all([
      this.findDbtRpcPythonVersion(),
      this.findDbtPythonVersion(),
      this.dbtRpcGlobal,
      this.dbtGlobal,
    ]);

    console.log(
      `dbtRpcGlobalVersion = ${getStringVersion(dbtRpcGlobalVersion)}, dbtGlobalVersion = ${getStringVersion(
        dbtGlobalVersion,
      )}, dbtPythonVersion = ${getStringVersion(dbtPythonVersion)}, dbtRpcPythonVersion = ${getStringVersion(dbtRpcPythonVersion)}`,
    );

    if (dbtRpcPythonVersion) {
      this.version = dbtRpcPythonVersion;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.python);
    }
    if (dbtPythonVersion) {
      this.version = dbtPythonVersion;
      return dbtPythonVersion.major >= 1 ? this.installAndFindCommandForV1() : new DbtCommand(FeatureFinder.LEGACY_DBT_PARAMS, this.python);
    }
    if (dbtRpcGlobalVersion) {
      this.version = dbtRpcGlobalVersion;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS);
    }
    if (dbtGlobalVersion) {
      this.version = dbtGlobalVersion;
      return dbtGlobalVersion.major >= 1 ? this.installAndFindCommandForV1() : new DbtCommand(FeatureFinder.LEGACY_DBT_PARAMS);
    }
    return undefined;
  }

  findFreePort(): Promise<number> {
    return findFreePortPmfy(randomNumber(1024, 65535));
  }

  private async installAndFindCommandForV1(): Promise<Command | undefined> {
    if (this.python === 'python') {
      this.python = 'python3';
    }

    try {
      await this.installLatestDbtRpc();
    } catch (e) {
      console.log('Error while installing dbt-rpc');
      return undefined;
    }

    return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.python);
  }

  private async findDbtRpcGlobalVersion(): Promise<DbtVersion | undefined> {
    return this.findCommandVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM]));
  }

  private async findDbtGlobalVersion(): Promise<DbtVersion | undefined> {
    return this.findCommandVersion(new DbtCommand([FeatureFinder.VERSION_PARAM]));
  }

  private async findDbtRpcPythonVersion(): Promise<DbtVersion | undefined> {
    return this.findCommandPythonVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM], this.python));
  }

  private async findDbtPythonVersion(): Promise<DbtVersion | undefined> {
    return this.findCommandPythonVersion(new DbtCommand([FeatureFinder.VERSION_PARAM], this.python));
  }

  private async findCommandPythonVersion(command: Command): Promise<DbtVersion | undefined> {
    return this.python ? this.findCommandVersion(command) : undefined;
  }

  private async findCommandVersion(command: Command): Promise<DbtVersion | undefined> {
    let version: DbtVersion | undefined;
    const readVersion: (data: string) => void = (data: string) => {
      const matchResults = data.match(FeatureFinder.DBT_VERSION_PATTERN);
      version =
        matchResults?.length === 4
          ? {
              major: Number(matchResults[1]),
              minor: Number(matchResults[2]),
              patch: Number(matchResults[3]),
            }
          : undefined;
    };

    await FeatureFinder.PROCESS_EXECUTOR.execProcess(command.toString(), readVersion, readVersion).catch(_ => {
      // Do nothing
    });
    return version;
  }

  private async installLatestDbtRpc(): Promise<void> {
    await FeatureFinder.PROCESS_EXECUTOR.execProcess(`${this.python} -m pip install dbt-bigquery dbt-rpc`);
  }
}
