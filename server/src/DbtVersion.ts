export interface DbtVersionInfo {
  installedVersion?: Version;
  latestVersion?: Version;
  installedAdapter?: Version;
}

export interface Version {
  major: number;
  minor: number;
  patch: number;
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
