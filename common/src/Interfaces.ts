export interface TelemetryEvent {
  name: string;
  properties?: { [key: string]: string };
}

export interface PythonInfo {
  path: string;
  version?: string[];
  dotEnvFile?: string;
}

export type LspModeType = 'dbtProject' | 'noProject';

export interface CustomInitParams {
  pythonInfo: PythonInfo;
  lspMode: LspModeType;
  enableSnowflakeSyntaxCheck: boolean;
  disableLogger?: boolean;
  profilesDir?: string;
}

export type RefReplacement = { from: string; to: string };
