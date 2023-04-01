export interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export interface PythonInfo {
  path: string;
  version?: string[];
}

export type LspModeType = 'dbtProject' | 'noProject';

export interface CustomInitParams {
  pythonInfo?: PythonInfo;
  lspMode: LspModeType;
  enableEntireProjectAnalysis: boolean;
  disableLogger?: boolean;
  profilesDir?: string;
}
