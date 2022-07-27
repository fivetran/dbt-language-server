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

export interface Status {
  pythonStatus: PythonStatus;
}

export interface PythonStatus {
  path?: string;
}

export interface StatusNotification {
  projectPath: string;
  status: Status;
}
