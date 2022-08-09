import { Event, Uri } from 'vscode';

// https://github.com/microsoft/vscode-python/blob/3698950c97982f31bb9dbfc19c4cd8308acda284/src/client/api.ts#L22
export interface IExtensionApi {
  settings: {
    /**
     * An event that is emitted when execution details (for a resource) change. For instance, when interpreter configuration changes.
     */
    readonly onDidChangeExecutionDetails: Event<Uri | undefined>;

    getExecutionDetails(resource?: Resource): {
      execCommand: string[] | undefined;
    };
  };
}

// https://github.com/microsoft/vscode-python/blob/main/src/client/apiTypes.ts
export interface IProposedExtensionAPI {
  environment: {
    /**
     * Returns details for the given interpreter. Details such as absolute interpreter path,
     * version, type (conda, pyenv, etc). Metadata such as `sysPrefix` can be found under
     * metadata field.
     * @param path : Full path to environment folder or interpreter whose details you need.
     * @param options : [optional]
     *     * useCache : When true, cache is checked first for any data, returns even if there
     *                  is partial data.
     */
    getEnvironmentDetails(path: string, options?: EnvironmentDetailsOptions): Promise<EnvironmentDetails | undefined>;
  };
}

interface EnvironmentDetailsOptions {
  useCache: boolean;
}

interface EnvironmentDetails {
  version: string[];
}

type Resource = Uri | undefined;
