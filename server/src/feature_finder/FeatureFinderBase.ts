import { AdapterInfo, DbtVersionInfo, getStringVersion, PythonInfo, Version } from 'dbt-language-server-common';
import * as fs from 'node:fs';
import { homedir } from 'node:os';
import { Command } from '../dbt_execution/commands/Command';
import { DbtCommandExecutor } from '../dbt_execution/commands/DbtCommandExecutor';
import { DbtCommandFactory } from '../dbt_execution/DbtCommandFactory';
import { getAxios } from '../utils/Utils';
import path = require('node:path');
import slash = require('slash');

export class FeatureFinderBase {
  private static readonly DBT_INSTALLED_VERSION_PATTERN = /installed.*:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_LATEST_VERSION_PATTERN = /latest.*:\s+(\d+)\.(\d+)\.(\d+)/;
  private static readonly DBT_ADAPTER_PATTERN = /- (\w+):.*/g;
  private static readonly DBT_ADAPTER_VERSION_PATTERN = /:\s+(\d+)\.(\d+)\.(\d+)/;

  private static readonly PROFILES_YML = 'profiles.yml';

  dbtCommandFactory: DbtCommandFactory;
  versionInfo?: DbtVersionInfo;
  profilesYmlDir: string;

  constructor(public pythonInfo: PythonInfo | undefined, private dbtCommandExecutor: DbtCommandExecutor, profilesDir: string | undefined) {
    this.profilesYmlDir = slash(path.resolve(FeatureFinderBase.getProfilesYmlDir(profilesDir)));
    this.dbtCommandFactory = new DbtCommandFactory(pythonInfo?.path, this.profilesYmlDir);
  }

  getProfilesYmlPath(): string {
    return path.join(this.profilesYmlDir, FeatureFinderBase.PROFILES_YML);
  }

  getPythonPath(): string | undefined {
    return this.pythonInfo?.path;
  }

  async getDbtCoreInstallVersions(): Promise<string[]> {
    return this.getPipPackageVersions('dbt-core');
  }

  protected async findDbtPythonInfo(): Promise<DbtVersionInfo | undefined> {
    return this.findCommandPythonInfo(this.dbtCommandFactory.getDbtWithPythonVersion());
  }

  protected async findCommandInfo(command: Command): Promise<DbtVersionInfo> {
    const { stderr } = await this.dbtCommandExecutor.execute(command);

    const installedVersion = FeatureFinderBase.readVersionByPattern(stderr, FeatureFinderBase.DBT_INSTALLED_VERSION_PATTERN);
    const latestVersion = FeatureFinderBase.readVersionByPattern(stderr, FeatureFinderBase.DBT_LATEST_VERSION_PATTERN);
    const installedAdapters = FeatureFinderBase.getInstalledAdapters(stderr.slice(stderr.indexOf('Plugins:')));

    return {
      installedVersion,
      latestVersion,
      installedAdapters,
    };
  }

  private async getPipPackageVersions(packageName: string): Promise<string[]> {
    const url = `https://pypi.org/pypi/${packageName}/json`;
    try {
      const axios = await getAxios();
      const response = await axios.get(url);
      return Object.keys((response.data as { releases: { [key: string]: unknown } }).releases).filter(r => !/[a-zA-Z]/.test(r) && Number(r[0]) >= 1);
    } catch (e) {
      console.log(`Failed to get package versions: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  private async findCommandPythonInfo(command: Command): Promise<DbtVersionInfo | undefined> {
    return command.python ? this.findCommandInfo(command) : undefined;
  }

  protected getLogString(name: string, dbtVersionInfo?: DbtVersionInfo): string {
    return dbtVersionInfo ? `${name} = ${getStringVersion(dbtVersionInfo.installedVersion)} ` : '';
  }

  private static getInstalledAdapters(data: string): AdapterInfo[] {
    const adaptersInfo: AdapterInfo[] = [];
    let m: RegExpExecArray | null;

    while ((m = FeatureFinderBase.DBT_ADAPTER_PATTERN.exec(data))) {
      if (m.length >= 2) {
        adaptersInfo.push({
          name: m[1],
          version: FeatureFinderBase.readVersionByPattern(m[0], FeatureFinderBase.DBT_ADAPTER_VERSION_PATTERN),
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

  private static getProfilesYmlDir(profilesDir?: string): string {
    if (profilesDir) {
      return profilesDir;
    }

    const dirFromEnv = process.env['DBT_PROFILES_DIR'];
    if (dirFromEnv) {
      return dirFromEnv;
    }

    const currentDir = '.';
    if (fs.existsSync(path.join(currentDir, FeatureFinderBase.PROFILES_YML))) {
      return currentDir;
    }

    return path.join(homedir(), '.dbt');
  }
}
