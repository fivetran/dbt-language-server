import { DbtPackageInfo, DbtPackageVersions, DbtVersionInfo, PythonInfo } from 'dbt-language-server-common';
import { promises as fsPromises } from 'node:fs';
import * as semver from 'semver';
import * as yaml from 'yaml';
import { DbtRepository } from '../DbtRepository';
import { Command } from '../dbt_execution/commands/Command';
import { DbtCommandExecutor } from '../dbt_execution/commands/DbtCommandExecutor';
import { DbtCommandFactory } from '../dbt_execution/DbtCommandFactory';
import { InstallUtils } from '../InstallUtils';
import { ProcessExecutor } from '../ProcessExecutor';
import { Lazy } from '../utils/Lazy';
import { getAxios, randomNumber } from '../utils/Utils';
import { FeatureFinderBase } from './FeatureFinderBase';
import findFreePortPmfy = require('find-free-port');

interface HubJson {
  [key: string]: string[];
}

export class FeatureFinder extends FeatureFinderBase {
  private static readonly WSL_UBUNTU_DEFAULT_NAME = 'Ubuntu-20.04';
  private static readonly WSL_UBUNTU_ENV_NAME = 'WIZARD_FOR_DBT_WSL_UBUNTU_NAME';

  static getWslUbuntuName(): string {
    const valueFromEnv = process.env[FeatureFinder.WSL_UBUNTU_ENV_NAME];
    if (valueFromEnv) {
      return valueFromEnv;
    }
    return FeatureFinder.WSL_UBUNTU_DEFAULT_NAME;
  }

  availableCommandsPromise: Promise<[DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?]>;
  packagesYmlExistsPromise: Promise<boolean>;
  packageInfosPromise = new Lazy(() => this.getListOfPackages());
  ubuntuInWslWorks: Promise<boolean>;

  constructor(pythonInfo: PythonInfo | undefined, dbtCommandExecutor: DbtCommandExecutor) {
    super(pythonInfo, dbtCommandExecutor);

    this.dbtCommandFactory = new DbtCommandFactory(pythonInfo?.path);
    this.availableCommandsPromise = this.getAvailableDbt();
    this.packagesYmlExistsPromise = this.packagesYmlExists();
    this.ubuntuInWslWorks = this.checkUbuntuInWslWorks();
  }

  runPostInitTasks(): Promise<unknown> {
    return this.packageInfosPromise.get();
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
    const axios = await getAxios();
    const hubResponse = await axios.get<HubJson>('https://cdn.jsdelivr.net/gh/dbt-labs/hubcap@HEAD/hub.json');
    const uriPromises = Object.entries<string[]>(hubResponse.data).flatMap(([gitHubUser, repositoryNames]) =>
      repositoryNames.map(r => this.getPackageInfo(gitHubUser, r)),
    );
    const infos = await Promise.all(uriPromises);
    return infos.filter((i): i is DbtPackageInfo => i !== undefined);
  }

  async getPackageInfo(gitHubUser: string, repositoryName: string): Promise<DbtPackageInfo | undefined> {
    try {
      const axios = await getAxios();
      const response = await axios.get<string>(
        `https://cdn.jsdelivr.net/gh/${gitHubUser}/${repositoryName}@HEAD/${DbtRepository.DBT_PROJECT_FILE_NAME}`,
      );
      const parsedYaml = yaml.parse(response.data, { uniqueKeys: false }) as { name: string | undefined };
      const packageName = parsedYaml.name;
      if (packageName !== undefined) {
        return {
          gitHubUser,
          repositoryName,
          installString: `${gitHubUser}/${packageName}`,
        };
      }
    } catch {
      // Do nothing
    }
    return undefined;
  }

  async packageVersions(dbtPackage: string): Promise<DbtPackageVersions> {
    const packages = await this.packageInfosPromise.get();
    const packageInfo = packages.find(p => p.installString === dbtPackage);
    const result: DbtPackageVersions = {};

    if (packageInfo) {
      const axios = await getAxios();
      const tagsResult = await axios.get<{ ref: string }[]>(
        `https://api.github.com/repos/${packageInfo.gitHubUser}/${packageInfo.repositoryName}/git/refs/tags?per_page=100`,
      );

      const indexOfTag = 'refs/tags/'.length;
      for (const tagInfo of tagsResult.data) {
        const tag = tagInfo.ref.slice(indexOfTag);
        const validTag = semver.valid(tag);
        if (validTag) {
          result[validTag] = tag;
        }
      }
    }
    return result;
  }

  async checkUbuntuInWslWorks(): Promise<boolean> {
    if (process.platform === 'win32') {
      try {
        const text = 'Wizard for dbt Core (TM)';
        const result = await new ProcessExecutor().execProcess(`wsl -d ${FeatureFinder.getWslUbuntuName()} echo "${text}"`);
        return result.stdout.includes(text);
      } catch {
        console.log('Error while running wsl');
        return false;
      }
    }
    return true;
  }

  async getAvailableDbt(): Promise<[DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?, DbtVersionInfo?]> {
    const settledResults = await Promise.allSettled([
      this.findDbtRpcPythonInfo(),
      this.findDbtPythonInfo(),
      this.findDbtRpcGlobalInfo(),
      this.findDbtGlobalInfo(),
    ]);
    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion, dbtGlobalVersion] = settledResults.map(v =>
      v.status === 'fulfilled' ? v.value : undefined,
    );

    console.log(
      this.getLogString('dbtRpcGlobalVersion', dbtRpcGlobalVersion) +
        this.getLogString('dbtPythonVersion', dbtPythonVersion) +
        this.getLogString('dbtRpcPythonVersion', dbtRpcPythonVersion) +
        this.getLogString('dbtGlobalVersion', dbtGlobalVersion),
    );

    return [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion, dbtGlobalVersion];
  }

  /** Tries to find a suitable command to start the server first in the current Python environment and then in the global scope.
   * Installs dbt-rpc for dbt version > 1.0.0.
   * @returns {Command} or `undefined` if nothing is found
   */
  async findDbtRpcCommand(dbtProfileType?: string): Promise<Command | undefined> {
    const [dbtRpcPythonVersion, dbtPythonVersion, dbtRpcGlobalVersion] = await this.availableCommandsPromise;

    if (dbtRpcPythonVersion?.installedVersion) {
      this.versionInfo = dbtRpcPythonVersion;
      return this.dbtCommandFactory.getDbtRpcRun();
    }
    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
      return dbtPythonVersion.installedVersion.major >= 1
        ? this.installAndFindCommandForV1(dbtProfileType)
        : this.dbtCommandFactory.getLegacyDbtRpcRun();
    }
    if (dbtRpcGlobalVersion?.installedVersion) {
      this.versionInfo = dbtRpcGlobalVersion;
      return this.dbtCommandFactory.getGlobalDbtRpcRun();
    }

    return undefined;
  }

  async findInformationForCli(): Promise<string | undefined> {
    const [, dbtPythonVersion, , dbtGlobalVersion] = await this.availableCommandsPromise;

    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
      return this.getPythonPath();
    }

    if (dbtGlobalVersion?.installedVersion) {
      this.versionInfo = dbtGlobalVersion;
    }

    return undefined;
  }

  findFreePort(): Promise<number> {
    return findFreePortPmfy(randomNumber(1024, 65_535));
  }

  private async installAndFindCommandForV1(dbtProfileType?: string): Promise<Command | undefined> {
    if (this.pythonInfo) {
      const installResult = await InstallUtils.installLatestDbtRpc(this.pythonInfo.path, dbtProfileType);
      if (installResult.isOk()) {
        return this.dbtCommandFactory.getDbtRpcRun();
      }
    }
    return undefined;
  }

  private async findDbtRpcGlobalInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandInfo(this.dbtCommandFactory.getDbtRpcGlobalVersion());
  }

  private async findDbtGlobalInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandInfo(this.dbtCommandFactory.getDbtGlobalVersion());
  }
}
