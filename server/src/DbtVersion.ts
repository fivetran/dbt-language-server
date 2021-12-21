export interface DbtVersion {
  major: number;
  minor: number;
  patch: number;
}

export function getStringVersion(version: DbtVersion | undefined): string {
  return version ? `${version.major}.${version.minor}.${version.patch}` : 'undefined';
}
