import { Octokit } from '@octokit/rest';
import axios from 'axios';
import { AdapterInfo, DbtPackageInfo, DbtPackageVersions, DbtVersionInfo, getStringVersion, PythonInfo, Version } from 'dbt-language-server-common';
import { promises as fsPromises } from 'fs';
import * as semver from 'semver';
import * as yaml from 'yaml';
import { DbtRepository } from './DbtRepository';
import { DbtUtilitiesInstaller } from './DbtUtilitiesInstaller';
import { Command } from './dbt_execution/commands/Command';
import { DbtCommandExecutor } from './dbt_execution/commands/DbtCommandExecutor';
import { DbtCommandFactory } from './dbt_execution/DbtCommandFactory';
import { randomNumber } from './utils/Utils';
import findFreePortPmfy = require('find-free-port');

interface HubJson {
  [key: string]: string[];
}

export class FeatureFinder {
  private static readonly DBT_INSTALLED_VERSION_PATTERN = /installed.*:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_LATEST_VERSION_PATTERN = /latest.*:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_ADAPTER_PATTERN = /- (\w+):.*/g;
  private static readonly DBT_ADAPTER_VERSION_PATTERN = /:\s+(\d+)\.(\d+)\.(\d+)/;

  versionInfo?: DbtVersionInfo;
  availableCommandsPromise: Promise<[DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?]>;
  packagesYmlExistsPromise: Promise<boolean>;
  packageInfosPromise: Promise<DbtPackageInfo[]>;

  dbtCommandFactory: DbtCommandFactory;

  constructor(public pythonInfo: PythonInfo | undefined, private dbtCommandExecutor: DbtCommandExecutor) {
    this.dbtCommandFactory = new DbtCommandFactory(pythonInfo?.path);
    this.availableCommandsPromise = this.getAvailableDbt();
    this.packagesYmlExistsPromise = this.packagesYmlExists();
    this.packageInfosPromise = this.getListOfPackages();
  }

  getPythonPath(): string | undefined {
    return this.pythonInfo?.path;
  }

  getPythonVersion(): [number, number] | undefined {
    return this.pythonInfo?.version && this.pythonInfo.version.length >= 2
      ? [Number(this.pythonInfo.version[0]), Number(this.pythonInfo.version[1])]
      : undefined;
  }

  async packagesYmlExists(): Promise<boolean> {
    try {
      await fsPromises.stat(DbtRepository.DBT_PACKAGES_FILE_NAME);
      return true;
    } catch {
      return false;
    }
  }

  async getListOfPackages(): Promise<DbtPackageInfo[]> {
    const hubResponse = await axios.get<HubJson>('https://cdn.jsdelivr.net/gh/dbt-labs/hubcap/hub.json');
    const uriPromises = Object.entries<string[]>(hubResponse.data).flatMap(([gitHubUser, repositoryNames]) =>
      repositoryNames.map(r => this.getPackageInfo(gitHubUser, r)),
    );
    const infos = await Promise.all(uriPromises);
    return infos.filter((i): i is DbtPackageInfo => i !== undefined);
  }

  async getPackageInfo(gitHubUser: string, repositoryName: string): Promise<DbtPackageInfo | undefined> {
    try {
      const response = await axios.get<string>(`https://cdn.jsdelivr.net/gh/${gitHubUser}/${repositoryName}/${DbtRepository.DBT_PROJECT_FILE_NAME}`);
      const parsedYaml = yaml.parse(response.data, { uniqueKeys: false }) as { name: string | undefined };
      const packageName = parsedYaml.name;
      if (packageName !== undefined) {
        return {
          gitHubUser,
          repositoryName,
          installString: `${gitHubUser}/${packageName}`,
        };
      }
    } catch (e) {
      // Do nothing
    }
    return undefined;
  }

  async packageVersions(dbtPackage: string): Promise<DbtPackageVersions> {
    const octokit = new Octokit();
    const packageInfo = (await this.packageInfosPromise).find(p => p.installString === dbtPackage);
    const result: DbtPackageVersions = {};

    if (packageInfo) {
      const tagsResult = await octokit.rest.repos.listTags({
        owner: packageInfo.gitHubUser,
        repo: packageInfo.repositoryName,
        per_page: 100,
      });

      for (const tag of tagsResult.data) {
        const validTag = semver.valid(tag.name);
        if (validTag) {
          result[validTag] = tag.name;
        }
      }
    }
    return result;
  }

  async getAvailableDbt(): Promise<[DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?]> {
    const settledResults = await Promise.allSettled([
      this.findDbtRpcPythonInfo(),
      this.findDbtPythonInfo(),
      this.findDbtRpcGlobalInfo(),
      this.findDbtGlobalInfo(),
    ]);
    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion, dbtGlobalVersion] = settledResults.map(v => {
      return v.status === 'fulfilled' ? v.value : undefined;
    });

    console.log(
      this.getLogString('dbtRpcGlobalVersion', dbtRpcGlobalVersion) +
        this.getLogString('dbtPythonVersion', dbtPythonVersion) +
        this.getLogString('dbtRpcPythonVersion', dbtRpcPythonVersion) +
        this.getLogString('dbtGlobalVersion', dbtGlobalVersion),
    );

    return [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion, dbtGlobalVersion];
  }

  getLogString(name: string, dbtVersionInfo?: DbtVersionInfo): string {
    return dbtVersionInfo ? `${name} = ${getStringVersion(dbtVersionInfo.installedVersion)} ` : '';
  }

  /** Tries to find a suitable command to start the server first in the current Python environment and then in the global scope.
   * Installs dbt-rpc for dbt version > 1.0.0.
   * @returns {Command} or `undefined` if nothing is found
   */
  async findDbtRpcCommand(dbtProfileType?: string): Promise<Command | undefined> {
    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion] = await this.availableCommandsPromise;

    if (dbtRpcPythonVersion?.installedVersion && dbtRpcPythonVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtRpcPythonVersion;
      return this.dbtCommandFactory.getDbtRpcRun();
    }
    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
      return dbtPythonVersion.installedVersion.major >= 1
        ? this.installAndFindCommandForV1(dbtProfileType)
        : this.dbtCommandFactory.getLegacyDbtRpcRun();
    }
    if (dbtRpcGlobalVersion?.installedVersion && dbtRpcGlobalVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtRpcGlobalVersion;
      return this.dbtCommandFactory.getGlobalDbtRpcRun();
    }

    return undefined;
  }

  async findInformationForCli(dbtProfileType?: string): Promise<string | undefined> {
    const [, dbtPythonVersion, , dbtGlobalVersion] = await this.availableCommandsPromise;

    if (dbtPythonVersion?.installedVersion && dbtPythonVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtPythonVersion;
      return this.getPythonPath();
    }

    if (dbtGlobalVersion?.installedVersion && dbtGlobalVersion.installedAdapters.some(a => a.name === dbtProfileType)) {
      this.versionInfo = dbtGlobalVersion;
    }

    return undefined;
  }

  findFreePort(): Promise<number> {
    return findFreePortPmfy(randomNumber(1024, 65535));
  }

  private async installAndFindCommandForV1(dbtProfileType?: string): Promise<Command | undefined> {
    if (this.pythonInfo) {
      const installResult = await DbtUtilitiesInstaller.installLatestDbtRpc(this.pythonInfo.path, dbtProfileType);
      if (installResult.isOk()) {
        return this.dbtCommandFactory.getDbtRpcRun();
      }
    }
    return undefined;
  }

  private async findDbtRpcPythonInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonInfo(this.dbtCommandFactory.getDbtRpcWithPythonVersion());
  }

  private async findDbtPythonInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonInfo(this.dbtCommandFactory.getDbtWithPythonVersion());
  }

  private async findDbtRpcGlobalInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandInfo(this.dbtCommandFactory.getDbtRpcGlobalVersion());
  }

  private async findDbtGlobalInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandInfo(this.dbtCommandFactory.getDbtGlobalVersion());
  }

  private async findCommandPythonInfo(command: Command): Promise<DbtVersionInfo | undefined> {
    return command.python ? this.findCommandInfo(command) : undefined;
  }

  private async findCommandInfo(command: Command): Promise<DbtVersionInfo> {
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
