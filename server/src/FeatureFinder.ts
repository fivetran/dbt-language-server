import { DbtUtilitiesInstaller } from './DbtUtilitiesInstaller';
import { DbtVersionInfo, getStringVersion, Version } from './DbtVersion';
import { Command } from './dbt_commands/Command';
import { DbtCommand } from './dbt_commands/DbtCommand';
import { DbtCommandExecutor } from './dbt_commands/DbtCommandExecutor';
import { DbtRpcCommand } from './dbt_commands/DbtRpcCommand';
import { randomNumber } from './utils/Utils';
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

  private static readonly DBT_INSTALLED_VERSION_PATTERN_LESS_1_1_0 = /installed version: (\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_INSTALLED_VERSION_PATTERN = /installed:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_LATEST_VERSION_PATTERN_LESS_1_1_0 = /latest version:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_LATEST_VERSION_PATTERN = /latest:\s+(\d+)\.(\d+)\.(\d+)/;

  private static readonly DBT_ADAPTER_VERSION_PATTERN_PREFIX = ':\\s+(\\d+).(\\d+).(\\d+)';

  private static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();

  versionInfo?: DbtVersionInfo;

  constructor(public python: string | undefined) {}

  /** Tries to find a suitable command to start the server first in the current Python environment and then in the global scope.
   * Installs dbt-rpc for dbt version > 1.0.0.
   * @returns {Command} or `undefined` if nothing is found
   */
  async findDbtRpcCommand(dbtProfileType: string | undefined): Promise<Command | undefined> {
    const settledResults = await Promise.allSettled([
      this.findDbtRpcPythonVersion(dbtProfileType),
      this.findDbtPythonVersion(dbtProfileType),
      this.findDbtRpcGlobalVersion(dbtProfileType),
    ]);

    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion] = settledResults.map(v => {
      return v.status === 'fulfilled' ? v.value : undefined;
    });

    let versions = '';
    versions += dbtRpcGlobalVersion ? `dbtRpcGlobalVersion = ${getStringVersion(dbtRpcGlobalVersion.installedVersion)} ` : '';
    versions += dbtPythonVersion ? `dbtPythonVersion = ${getStringVersion(dbtPythonVersion.installedVersion)} ` : '';
    versions += dbtRpcPythonVersion ? `dbtRpcPythonVersion = ${getStringVersion(dbtRpcPythonVersion.installedVersion)}` : '';

    console.log(versions);

    if (dbtRpcPythonVersion?.installedVersion && dbtRpcPythonVersion.installedAdapter) {
      this.versionInfo = dbtRpcPythonVersion;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.python);
    }
    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
      return dbtPythonVersion.installedVersion.major >= 1
        ? this.installAndFindCommandForV1(dbtProfileType)
        : new DbtCommand(FeatureFinder.LEGACY_DBT_PARAMS, this.python);
    }
    if (dbtRpcGlobalVersion?.installedVersion && dbtRpcGlobalVersion.installedAdapter) {
      this.versionInfo = dbtRpcGlobalVersion;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS);
    }

    return undefined;
  }

  async findGlobalDbtCommand(dbtProfileType: string | undefined): Promise<boolean> {
    const settledResults = await Promise.allSettled([this.findDbtPythonVersion(dbtProfileType), this.findDbtGlobalVersion(dbtProfileType)]);

    const [dbtPythonVersion, dbtGlobalVersion] = settledResults.map(v => {
      return v.status === 'fulfilled' ? v.value : undefined;
    });

    let versions = '';
    versions += dbtPythonVersion ? `dbtPythonVersion = ${getStringVersion(dbtPythonVersion.installedVersion)} ` : '';
    versions += dbtGlobalVersion ? `dbtGlobalVersion = ${getStringVersion(dbtGlobalVersion.installedVersion)}` : '';

    console.log(versions);

    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
    } else if (dbtGlobalVersion?.installedVersion) {
      this.versionInfo = dbtGlobalVersion;
    }

    return dbtPythonVersion === undefined && dbtGlobalVersion !== undefined;
  }

  findFreePort(): Promise<number> {
    return findFreePortPmfy(randomNumber(1024, 65535));
  }

  private async installAndFindCommandForV1(dbtProfileType: string | undefined): Promise<Command | undefined> {
    if (this.python) {
      const installResult = await DbtUtilitiesInstaller.installLatestDbtRpc(this.python, dbtProfileType);
      if (installResult.isOk()) {
        return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.python);
      }
    }
    return undefined;
  }

  private async findDbtRpcGlobalVersion(dbtProfileType: string | undefined): Promise<DbtVersionInfo | undefined> {
    return this.findCommandVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM]), dbtProfileType);
  }

  private async findDbtRpcPythonVersion(dbtProfileType: string | undefined): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM], this.python), dbtProfileType);
  }

  private async findDbtPythonVersion(dbtProfileType: string | undefined): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonVersion(new DbtCommand([FeatureFinder.VERSION_PARAM], this.python), dbtProfileType);
  }

  private async findDbtGlobalVersion(dbtProfileType: string | undefined): Promise<DbtVersionInfo | undefined> {
    return this.findCommandVersion(new DbtCommand([FeatureFinder.VERSION_PARAM]), dbtProfileType);
  }

  private async findCommandPythonVersion(command: Command, dbtProfileType: string | undefined): Promise<DbtVersionInfo | undefined> {
    return command.python ? this.findCommandVersion(command, dbtProfileType) : undefined;
  }

  private async findCommandVersion(command: Command, dbtProfileType: string | undefined): Promise<DbtVersionInfo> {
    const { stdout, stderr } = await FeatureFinder.DBT_COMMAND_EXECUTOR.execute(command);

    const installedVersion = FeatureFinder.readInstalledVersion(stderr) ?? FeatureFinder.readInstalledVersion(stdout);
    const latestVersion = FeatureFinder.readLatestVersion(stderr) ?? FeatureFinder.readLatestVersion(stdout);

    let installedAdapter: Version | undefined = undefined;

    if (dbtProfileType) {
      const dbtAdapterRegex = new RegExp(dbtProfileType + FeatureFinder.DBT_ADAPTER_VERSION_PATTERN_PREFIX);
      installedAdapter = FeatureFinder.readVersionByPattern(stderr, dbtAdapterRegex) ?? FeatureFinder.readVersionByPattern(stdout, dbtAdapterRegex);
    }

    return {
      installedVersion,
      latestVersion,
      installedAdapter,
    };
  }

  private static readInstalledVersion(output: string): Version | undefined {
    return (
      FeatureFinder.readVersionByPattern(output, FeatureFinder.DBT_INSTALLED_VERSION_PATTERN) ??
      FeatureFinder.readVersionByPattern(output, FeatureFinder.DBT_INSTALLED_VERSION_PATTERN_LESS_1_1_0)
    );
  }

  private static readLatestVersion(output: string): Version | undefined {
    return (
      FeatureFinder.readVersionByPattern(output, FeatureFinder.DBT_LATEST_VERSION_PATTERN) ??
      FeatureFinder.readVersionByPattern(output, FeatureFinder.DBT_LATEST_VERSION_PATTERN_LESS_1_1_0)
    );
  }

  private static readVersionByPattern(data: string, pattern: RegExp): Version | undefined {
    const matchResults = data.match(pattern);
    return matchResults?.length === 4
      ? {
          major: Number(matchResults[1]),
          minor: Number(matchResults[2]),
          patch: Number(matchResults[3]),
        }
      : undefined;
  }
}
