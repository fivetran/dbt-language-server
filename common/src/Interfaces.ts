export interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export interface PythonInfo {
  path: string;
  version?: string[];
}

export type DbtCompilerType = 'Auto' | 'dbt-rpc' | 'dbt';
export type LspModeType = 'dbtProject' | 'noProject';

export interface CustomInitParams {
  pythonInfo?: PythonInfo;
  dbtCompiler: DbtCompilerType;
  lspMode: LspModeType;
}
