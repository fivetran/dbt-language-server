export interface DbtVersionInfo {
  installedVersion?: DbtVersion;
  latestVersion?: DbtVersion;
}

export interface DbtVersion {
  major: number;
  minor: number;
  patch: number;
}

export function getStringVersion(version: DbtVersion | undefined): string {
  return version ? `${version.major}.${version.minor}.${version.patch}` : 'undefined';
}

export function compareVersions(v1: DbtVersion, v2: DbtVersion): number {
  const v1Hash = getVersionHash(v1);
  const v2Hash = getVersionHash(v2);

  if (v1Hash === v2Hash) {
    return 0;
  }
  if (v1Hash > v2Hash) {
    return 1;
  }
  return -1;
}

function getVersionHash(version: DbtVersion): number {
  return version.major * 100000 + version.minor * 1000 + version.patch;
}
