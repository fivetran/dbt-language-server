import { PythonInfo } from 'dbt-language-server-common';
import { DbtUtilitiesInstaller } from './DbtUtilitiesInstaller';
import { AdapterInfo, DbtVersionInfo, getStringVersion, Version } from './DbtVersion';
import { Command } from './dbt_execution/commands/Command';
import { DbtCommand } from './dbt_execution/commands/DbtCommand';
import { DbtCommandExecutor } from './dbt_execution/commands/DbtCommandExecutor';
import { DbtRpcCommand } from './dbt_execution/commands/DbtRpcCommand';
import { randomNumber } from './utils/Utils';
import findFreePortPmfy = require('find-free-port');

export class FeatureFinder {
  private static readonly NO_VERSION_CHECK_PARAM = '--no-version-check';
  private static readonly PARTIAL_PARSE_PARAM = '--partial-parse';
  private static readonly PORT_PARAM = '--port';
  static readonly VERSION_PARAM = '--version';
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

  private static readonly DBT_INSTALLED_VERSION_PATTERN = /installed.*:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_LATEST_VERSION_PATTERN = /latest.*:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_ADAPTER_PATTERN = /- (\w+):.*/g;
  private static readonly DBT_ADAPTER_VERSION_PATTERN = /:\s+(\d+)\.(\d+)\.(\d+)/;

  versionInfo?: DbtVersionInfo;
  availableCommandsPromise: Promise<[DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?]>;

  constructor(public pythonInfo: PythonInfo | undefined, private dbtCommandExecutor: DbtCommandExecutor) {
    this.availableCommandsPromise = this.getAvailableDbt();
  }

  getPythonPath(): string | undefined {
    return this.pythonInfo?.path;
  }

  getPythonVersion(): [number, number] | undefined {
    return this.pythonInfo?.version && this.pythonInfo.version.length >= 2
      ? [Number(this.pythonInfo.version[0]), Number(this.pythonInfo.version[1])]
      : undefined;
  }

  async getAvailableDbt(): Promise<[DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?]> {
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
    versions += dbtPythonVersion ? `dbtPythonVersion = ${getStringVersion(dbtPythonVersion.installedVersion)} ` : '';
    versions += dbtRpcPythonVersion ? `dbtRpcPythonVersion = ${getStringVersion(dbtRpcPythonVersion.installedVersion)}` : '';
    versions += dbtGlobalVersion ? `dbtGlobalVersion = ${getStringVersion(dbtGlobalVersion.installedVersion)}` : '';

    console.log(versions);
    return [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion, dbtGlobalVersion];
  }

  /** Tries to find a suitable command to start the server first in the current Python environment and then in the global scope.
   * Installs dbt-rpc for dbt version > 1.0.0.
   * @returns {Command} or `undefined` if nothing is found
   */
  async findDbtRpcCommand(dbtProfileType?: string): Promise<Command | undefined> {
    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion] = await this.availableCommandsPromise;

    if (dbtRpcPythonVersion?.installedVersion && dbtRpcPythonVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtRpcPythonVersion;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.pythonInfo?.path);
    }
    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
      return dbtPythonVersion.installedVersion.major >= 1
        ? this.installAndFindCommandForV1(dbtProfileType)
        : new DbtCommand(FeatureFinder.LEGACY_DBT_PARAMS, this.pythonInfo?.path);
    }
    if (dbtRpcGlobalVersion?.installedVersion && dbtRpcGlobalVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtRpcGlobalVersion;
      return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS);
    }

    return undefined;
  }

  async findGlobalDbtCommand(dbtProfileType?: string): Promise<boolean> {
    const [, dbtPythonVersion, , dbtGlobalVersion] = await this.availableCommandsPromise;

    if (dbtPythonVersion?.installedVersion && dbtPythonVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtPythonVersion;
    } else if (dbtGlobalVersion?.installedVersion && dbtGlobalVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtGlobalVersion;
    }

    return dbtPythonVersion === undefined && dbtGlobalVersion !== undefined;
  }

  findFreePort(): Promise<number> {
    return findFreePortPmfy(randomNumber(1024, 65535));
  }

  private async installAndFindCommandForV1(dbtProfileType?: string): Promise<Command | undefined> {
    if (this.pythonInfo) {
      const installResult = await DbtUtilitiesInstaller.installLatestDbtRpc(this.pythonInfo.path, dbtProfileType);
      if (installResult.isOk()) {
        return new DbtRpcCommand(FeatureFinder.DBT_RPC_PARAMS, this.pythonInfo.path);
      }
    }
    return undefined;
  }

  private async findDbtRpcGlobalVersion(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM]));
  }

  private async findDbtRpcPythonVersion(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonVersion(new DbtRpcCommand([FeatureFinder.VERSION_PARAM], this.pythonInfo?.path));
  }

  private async findDbtPythonVersion(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonVersion(new DbtCommand([FeatureFinder.VERSION_PARAM], this.pythonInfo?.path));
  }

  private async findDbtGlobalVersion(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandVersion(new DbtCommand([FeatureFinder.VERSION_PARAM]));
  }

  private async findCommandPythonVersion(command: Command): Promise<DbtVersionInfo | undefined> {
    return command.python ? this.findCommandVersion(command) : undefined;
  }

  private async findCommandVersion(command: Command): Promise<DbtVersionInfo> {
    const { stderr } = await this.dbtCommandExecutor.execute(command);

    const installedVersion = FeatureFinder.readVersionByPattern(stderr, FeatureFinder.DBT_INSTALLED_VERSION_PATTERN);
    const latestVersion = FeatureFinder.readVersionByPattern(stderr, FeatureFinder.DBT_LATEST_VERSION_PATTERN);

    const installedAdapters = FeatureFinder.getInstalledAdapters(stderr.substring(stderr.indexOf('Plugins:')));

    return {
      installedVersion,
      latestVersion,
      installedAdapters,
    };
  }

  private static getInstalledAdapters(data: string): AdapterInfo[] {
    const adaptersInfo: AdapterInfo[] = [];
    let m: RegExpExecArray | null;

    while ((m = FeatureFinder.DBT_ADAPTER_PATTERN.exec(data))) {
      if (m.length >= 2) {
        adaptersInfo.push({
          name: m[1],
          version: FeatureFinder.readVersionByPattern(m[0], FeatureFinder.DBT_ADAPTER_VERSION_PATTERN),
        });
      }
    }

    return adaptersInfo;
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
