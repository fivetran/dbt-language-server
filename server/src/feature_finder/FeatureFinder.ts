import { DbtPackageInfo, DbtPackageVersions, DbtVersionInfo, PythonInfo } from 'dbt-language-server-common';
import { promises as fsPromises } from 'node:fs';
import * as semver from 'semver';
import * as yaml from 'yaml';
import { DbtRepository } from '../DbtRepository';
import { ProcessExecutor } from '../ProcessExecutor';
import { DbtCommandExecutor } from '../dbt_execution/commands/DbtCommandExecutor';
import { Lazy } from '../utils/Lazy';
import { getAxios, randomNumber } from '../utils/Utils';
import { FeatureFinderBase } from './FeatureFinderBase';
import findFreePortPmfy = require('find-free-port');
import path = require('node:path');

interface HubJson {
  [key: string]: string[];
}

interface InformationForCli {
  pythonPath: string | undefined;
  dbtLess1point5: boolean;
}

export class FeatureFinder extends FeatureFinderBase {
  private static readonly WSL_UBUNTU_DEFAULT_NAME = 'Ubuntu-20.04';
  private static readonly WSL_UBUNTU_ENV_NAME = 'WIZARD_FOR_DBT_WSL_UBUNTU_NAME';

  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  static getWslUbuntuName(): string {
    const valueFromEnv = process.env[FeatureFinder.WSL_UBUNTU_ENV_NAME];
    if (valueFromEnv) {
      return valueFromEnv;
    }
    return FeatureFinder.WSL_UBUNTU_DEFAULT_NAME;
  }

  availableCommandsPromise: Promise<[DbtVersionInfo | undefined, DbtVersionInfo | undefined, DbtVersionInfo | undefined]>;
  packagesYmlExistsPromise: Promise<boolean>;
  packageInfosPromise = new Lazy(() => this.getListOfDbtPackages());
  ubuntuInWslWorks: Promise<boolean>;

  constructor(pythonInfo: PythonInfo | undefined, dbtCommandExecutor: DbtCommandExecutor, profilesDir: string | undefined) {
    super(pythonInfo, dbtCommandExecutor, profilesDir);

    this.availableCommandsPromise = this.getAvailableDbt();
    this.packagesYmlExistsPromise = this.packagesYmlExists();
    this.ubuntuInWslWorks = this.checkUbuntuInWslWorks();
  }

  async runPostInitTasks(): Promise<void> {
    await this.packageInfosPromise.get();
  }

  async packagesYmlExists(): Promise<boolean> {
    try {
      await fsPromises.stat(DbtRepository.DBT_PACKAGES_FILE_NAME);
      return true;
    } catch {
      return false;
    }
  }

  async getListOfDbtPackages(): Promise<DbtPackageInfo[]> {
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

  async getDbtPackageVersions(dbtPackage: string): Promise<DbtPackageVersions> {
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
        const result = await FeatureFinder.PROCESS_EXECUTOR.execProcess(`wsl -d ${FeatureFinder.getWslUbuntuName()} echo "${text}"`);
        return result.stdout.includes(text);
      } catch {
        console.log('Error while running wsl');
        return false;
      }
    }
    return true;
  }

  async getGlobalProjectPath(): Promise<string | undefined> {
    const python = this.pythonInfo?.path;
    if (python) {
      const result = await FeatureFinder.PROCESS_EXECUTOR.execProcess(
        `${python} -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())"`,
      );
      if (result.stdout) {
        return path.join(result.stdout.trim(), 'dbt', 'include', 'global_project');
      }
    }
    return undefined;
  }

  async getAvailableDbt(): Promise<[DbtVersionInfo | undefined, DbtVersionInfo | undefined, DbtVersionInfo | undefined]> {
    const settledResults = await Promise.allSettled([this.findDbtPythonInfoOld(), this.findDbtPythonInfo(), this.findDbtGlobalInfo()]);
    const [dbtPythonVersionOld, dbtPythonVersion, dbtGlobalVersion] = settledResults.map(v => (v.status === 'fulfilled' ? v.value : undefined));

    console.log(
      this.getLogString('dbtPythonVersionOld', dbtPythonVersionOld) +
        this.getLogString('dbtPythonVersion', dbtPythonVersion) +
        this.getLogString('dbtGlobalVersion', dbtGlobalVersion),
    );

    return [dbtPythonVersionOld, dbtPythonVersion, dbtGlobalVersion];
  }

  async findInformationForCli(): Promise<InformationForCli> {
    const [dbtPythonVersionOld, dbtPythonVersion, dbtGlobalVersion] = await this.availableCommandsPromise;

    if (dbtPythonVersion?.installedVersion) {
      this.versionInfo = dbtPythonVersion;
      return {
        pythonPath: this.getPythonPath(),
        dbtLess1point5: false,
      };
    }

    if (dbtPythonVersionOld?.installedVersion) {
      this.versionInfo = dbtPythonVersionOld;
      return {
        pythonPath: this.getPythonPath(),
        dbtLess1point5: true,
      };
    }

    if (dbtGlobalVersion?.installedVersion) {
      this.versionInfo = dbtGlobalVersion;
    }

    return {
      pythonPath: undefined,
      dbtLess1point5: Boolean(
        this.versionInfo?.installedVersion && this.versionInfo.installedVersion.major <= 1 && this.versionInfo.installedVersion.minor < 5,
      ),
    };
  }

  findFreePort(): Promise<number> {
    return findFreePortPmfy(randomNumber(1024, 65_535));
  }

  private async findDbtGlobalInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandInfo(this.dbtCommandFactory.getDbtGlobalVersion());
  }
}
