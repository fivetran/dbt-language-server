export interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export interface PythonInfo {
  path: string;
  version?: string[];
}

export type DbtCompilerType = 'Auto' | 'dbt-rpc' | 'dbt';

export interface CustomInitParams {
  pythonInfo?: PythonInfo;
  dbtCompiler: DbtCompilerType;
}

export interface InstallDbtPackagesParams {
  projectPath: string;
  dbtPackageInfos: DbtPackageInfo[];
}

export interface DbtPackageInfo {
  gitHubUser: string;
  repositoryName: string;
  installString: string;
  versions?: string[];
}
