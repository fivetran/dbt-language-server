import { Axios } from 'axios';
import { DbtPackageInfo, DbtPackageVersions, PythonInfo } from 'dbt-language-server-common';
import { promises as fsPromises } from 'node:fs';
import * as semver from 'semver';
import * as yaml from 'yaml';
import { DbtRepository } from '../DbtRepository';
import { ProcessExecutor } from '../ProcessExecutor';
import { DbtCommandExecutor } from '../dbt_execution/DbtCommandExecutor';
import { Lazy } from '../utils/Lazy';
import { FeatureFinderBase } from './FeatureFinderBase';
import path = require('node:path');

interface HubJson {
  [key: string]: string[];
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

  packagesYmlExistsPromise: Promise<boolean>;
  packageInfosPromise = new Lazy(() => this.getListOfDbtPackages());
  ubuntuInWslWorks: Promise<boolean>;

  constructor(pythonInfo: PythonInfo, dbtCommandExecutor: DbtCommandExecutor, profilesDir: string | undefined) {
    super(pythonInfo, dbtCommandExecutor, profilesDir);

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
    const hubResponse = await new Axios().get<HubJson>('https://cdn.jsdelivr.net/gh/dbt-labs/hubcap@HEAD/hub.json');
    const uriPromises = Object.entries<string[]>(hubResponse.data).flatMap(([gitHubUser, repositoryNames]) =>
      repositoryNames.map(r => this.getPackageInfo(gitHubUser, r)),
    );
    const infos = await Promise.all(uriPromises);
    return infos.filter((i): i is DbtPackageInfo => i !== undefined);
  }

  async getPackageInfo(gitHubUser: string, repositoryName: string): Promise<DbtPackageInfo | undefined> {
    try {
      const response = await new Axios().get<string>(
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
      const tagsResult = await new Axios().get<{ ref: string }[]>(
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
    const python = this.pythonInfo.path;
    const result = await FeatureFinder.PROCESS_EXECUTOR.execProcess(
      `${python} -c "from distutils.sysconfig import get_python_lib; print(get_python_lib())"`,
    );
    if (result.stdout) {
      return path.join(result.stdout.trim(), 'dbt', 'include', 'global_project');
    }
    return undefined;
  }
}
