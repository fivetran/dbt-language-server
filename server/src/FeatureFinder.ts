import { Result } from 'neverthrow';
import { DbtUtilitiesInstaller } from './DbtUtilitiesInstaller';
import { DbtVersion, DbtVersionInfo, getStringVersion } from './DbtVersion';
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
  isDbtInPythonEnvironment?: boolean;

  constructor(private python: string, private dbtProfileType?: string) {}

  /** Tries to find a suitable command to start the server first in the current Python environment and then in the global scope.
   * Installs dbt-rpc for dbt version > 1.0.0.
   * @returns {Command} or `undefined` if nothing is found
   */
  async findDbtRpcCommand(): Promise<Command | undefined> {
    const settledResults = await Promise.allSettled([
      this.findDbtRpcPythonVersion(),
      this.findDbtPythonVersion(),
      this.findDbtRpcGlobalVersion(),
      this.findDbtGlobalVersion(),
    ]);

    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion, dbtGlobalVersion] = settledResults.map(v => {
      return v.status === 'fulfilled' ? v.value : undefined;
    });

    let versions = '';
    versions += dbtRpcGlobalVersion ? `dbtRpcGlobalVersion = ${getStringVersion(dbtRpcGlobalVersion.installedVersion)} ` : '';
    versions += dbtGlobalVersion ? `dbtGlobalVersion = ${getStringVersion(dbtGlobalVersion.installedVersion)} ` : '';
    versions += dbtPythonVersion ? `dbtPythonVersion = ${getStringVersion(dbtPythonVersion.installedVersion)} ` : '';
    versions += dbtRpcPythonVersion ? `dbtRpcPythonVersion = ${getStringVersion(dbtRpcPythonVersion.installedVersion)}` : '';

    console.log(versions);

    if (dbtRpcPythonVersion?.installedVersion && dbtRpcPythonVersion.installedPlugin) {
      this.versionInfo = dbtRpcPythonVersion;
      this.isDbtInPythonEnvironment = true;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.python);
    }
    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
      this.isDbtInPythonEnvironment = true;
      return dbtPythonVersion.installedVersion.major >= 1
        ? this.installAndFindCommandForV1()
        : new DbtCommand(FeatureFinder.LEGACY_DBT_PARAMS, this.python);
    }
    if (dbtRpcGlobalVersion?.installedVersion && dbtRpcGlobalVersion.installedPlugin) {
      this.versionInfo = dbtRpcGlobalVersion;
      this.isDbtInPythonEnvironment = false;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS);
    }
    if (dbtGlobalVersion?.installedVersion) {
      this.versionInfo = dbtGlobalVersion;
      this.isDbtInPythonEnvironment = false;
      return dbtGlobalVersion.installedVersion.major >= 1 ? this.installAndFindCommandForV1() : new DbtCommand(FeatureFinder.LEGACY_DBT_PARAMS);
    }

    return undefined;
  }

  findFreePort(): Promise<number> {
    return findFreePortPmfy(randomNumber(1024, 65535));
  }

  private async installAndFindCommandForV1(): Promise<Command | undefined> {
    const installResult = await this.installLatestDbtRpc();
    if (installResult.isOk()) {
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.python);
    }
    return undefined;
  }

  private async findDbtRpcGlobalVersion(): Promise<DbtVersionInfo | undefined> {
    return this.dbtProfileType ? this.findCommandVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM]), this.dbtProfileType) : undefined;
  }

  private async findDbtGlobalVersion(): Promise<DbtVersionInfo | undefined> {
    return this.dbtProfileType ? this.findCommandVersion(new DbtCommand([FeatureFinder.VERSION_PARAM]), this.dbtProfileType) : undefined;
  }

  private async findDbtRpcPythonVersion(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM], this.python));
  }

  private async findDbtPythonVersion(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonVersion(new DbtCommand([FeatureFinder.VERSION_PARAM], this.python));
  }

  private async findCommandPythonVersion(command: Command): Promise<DbtVersionInfo | undefined> {
    return this.python && this.dbtProfileType ? this.findCommandVersion(command, this.dbtProfileType) : undefined;
  }

  private async findCommandVersion(command: Command, dbtProfileType: string): Promise<DbtVersionInfo> {
    const { stdout, stderr } = await FeatureFinder.DBT_COMMAND_EXECUTOR.execute(command);

    const installedVersionFromStderr =
      FeatureFinder.readVersionByPattern(stderr, FeatureFinder.DBT_INSTALLED_VERSION_PATTERN) ??
      FeatureFinder.readVersionByPattern(stderr, FeatureFinder.DBT_INSTALLED_VERSION_PATTERN_LESS_1_1_0);
    const installedVersionFromStdout =
      FeatureFinder.readVersionByPattern(stdout, FeatureFinder.DBT_INSTALLED_VERSION_PATTERN) ??
      FeatureFinder.readVersionByPattern(stdout, FeatureFinder.DBT_INSTALLED_VERSION_PATTERN_LESS_1_1_0);

    const latestVersionFromStderr =
      FeatureFinder.readVersionByPattern(stderr, FeatureFinder.DBT_LATEST_VERSION_PATTERN) ??
      FeatureFinder.readVersionByPattern(stderr, FeatureFinder.DBT_LATEST_VERSION_PATTERN_LESS_1_1_0);
    const latestVersionFromStdout =
      FeatureFinder.readVersionByPattern(stdout, FeatureFinder.DBT_LATEST_VERSION_PATTERN) ??
      FeatureFinder.readVersionByPattern(stdout, FeatureFinder.DBT_LATEST_VERSION_PATTERN_LESS_1_1_0);

    const dbtAdapterPattern = dbtProfileType + FeatureFinder.DBT_ADAPTER_VERSION_PATTERN_PREFIX;
    const dbtAdapterRegex = new RegExp(dbtAdapterPattern);
    const adapterVersionFromStderr = FeatureFinder.readVersionByPattern(stderr, dbtAdapterRegex);
    const adapterVersionFromStdout = FeatureFinder.readVersionByPattern(stdout, dbtAdapterRegex);

    return {
      installedVersion: installedVersionFromStderr ?? installedVersionFromStdout,
      latestVersion: latestVersionFromStderr ?? latestVersionFromStdout,
      installedPlugin: adapterVersionFromStderr ?? adapterVersionFromStdout,
    };
  }

  private static readVersionByPattern(data: string, pattern: RegExp): DbtVersion | undefined {
    const matchResults = data.match(pattern);
    return matchResults?.length === 4
      ? {
          major: Number(matchResults[1]),
          minor: Number(matchResults[2]),
          patch: Number(matchResults[3]),
        }
      : undefined;
  }

  private async installLatestDbtRpc(): Promise<Result<string, string>> {
    const packages = [DbtUtilitiesInstaller.DBT_RPC];
    if (this.dbtProfileType) {
      packages.push(DbtUtilitiesInstaller.buildAdapterPackageName(this.dbtProfileType));
    }
    return DbtUtilitiesInstaller.installPackages(this.python, packages);
  }
}
