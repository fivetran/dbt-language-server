export interface PythonStatus {
  path?: string;
}

export interface StatusNotification {
  projectPath: string;
  pythonStatus?: PythonStatus;
  dbtStatus?: DbtStatus;
  packagesStatus?: PackagesStatus;
}

export interface DbtStatus {
  versionInfo?: DbtVersionInfo;
}

export interface PackagesStatus {
  packagesYmlFound: boolean;
}

export interface DbtVersionInfo {
  installedVersion?: Version;
  latestVersion?: Version;
  installedAdapters: AdapterInfo[];
}

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

export interface AdapterInfo {
  name: string;
  version?: Version;
}

export function getStringVersion(version: Version | undefined): string {
  return version ? `${version.major}.${version.minor}.${version.patch}` : 'undefined';
}

export function compareVersions(v1: Version, v2: Version): number {
  const v1Hash = getVersionHash(v1);
  const v2Hash = getVersionHash(v2);

  if (v1Hash === v2Hash) {
    return 0;
  }

  return v1Hash > v2Hash ? 1 : -1;
}

function getVersionHash(version: Version): number {
  return version.major * 100000 + version.minor * 1000 + version.patch;
}

export interface DbtPackageInfo {
  gitHubUser: string;
  repositoryName: string;
  installString: string;
  versions?: string[];
}

export type DbtPackageVersions = { [key: string]: string };

export interface SelectedDbtPackage {
  packageName: string;
  version: string;
}
