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

// https://github.com/microsoft/vscode-python/blob/main/src/client/proposedApiTypes.ts
export interface ProposedExtensionAPI {
  readonly environments: {
    /**
     * Returns details for the given environment, or `undefined` if the env is invalid.
     * @param environment : If string, it represents the full path to environment folder or python executable
     * for the environment. Otherwise it can be {@link Environment} or {@link EnvironmentPath} itself.
     */
    resolveEnvironment(environment: Environment | EnvironmentPath | string): Promise<ResolvedEnvironment | undefined>;
  };
}

/**
 * Derived form of {@link Environment} where certain properties can no longer be `undefined`. Meant to represent an
 * {@link Environment} with complete information.
 */
export type ResolvedEnvironment = Environment & {
  /**
   * Carries complete details about python executable.
   */
  readonly executable: {
    /**
     * Uri of the python interpreter/executable. Carries `undefined` in case an executable does not belong to
     * the environment.
     */
    readonly uri: Uri | undefined;
    /**
     * Bitness of the environment.
     */
    readonly bitness: Bitness;
    /**
     * Value of `sys.prefix` in sys module.
     */
    readonly sysPrefix: string;
  };
  /**
   * Carries complete Python version information, carries `undefined` for envs without python.
   */
  readonly version:
    | (ResolvedVersionInfo & {
        /**
         * Value of `sys.version` in sys module if known at this moment.
         */
        readonly sysVersion: string;
      })
    | undefined;
};

export type Environment = EnvironmentPath & {
  /**
   * Carries details about python executable.
   */
  readonly executable: {
    /**
     * Uri of the python interpreter/executable. Carries `undefined` in case an executable does not belong to
     * the environment.
     */
    readonly uri: Uri | undefined;
    /**
     * Bitness if known at this moment.
     */
    readonly bitness: Bitness | undefined;
    /**
     * Value of `sys.prefix` in sys module if known at this moment.
     */
    readonly sysPrefix: string | undefined;
  };
  /**
   * Carries details if it is an environment, otherwise `undefined` in case of global interpreters and others.
   */
  readonly environment:
    | {
        /**
         * Type of the environment.
         */
        readonly type: EnvironmentType;
        /**
         * Name to the environment if any.
         */
        readonly name: string | undefined;
        /**
         * Uri of the environment folder.
         */
        readonly folderUri: Uri;
        /**
         * Any specific workspace folder this environment is created for.
         */
        readonly workspaceFolder: Uri | undefined;
      }
    | undefined;
  /**
   * Carries Python version information known at this moment.
   */
  readonly version: VersionInfo & {
    /**
     * Value of `sys.version` in sys module if known at this moment.
     */
    readonly sysVersion: string | undefined;
  };
  /**
   * Tools/plugins which created the environment or where it came from. First value in array corresponds
   * to the primary tool which manages the environment, which never changes over time.
   *
   * Array is empty if no tool is responsible for creating/managing the environment. Usually the case for
   * global interpreters.
   */
  readonly tools: readonly EnvironmentTools[];
};

export type EnvironmentPath = {
  /**
   * The ID of the environment.
   */
  readonly id: string;
  /**
   * Path to environment folder or path to python executable that uniquely identifies an environment. Environments
   * lacking a python executable are identified by environment folder paths, whereas other envs can be identified
   * using python executable path.
   */
  readonly path: string;
};

/**
 * Type of the environment. It can be {@link KnownEnvironmentTypes} or custom string which was contributed.
 */
export type EnvironmentType = KnownEnvironmentTypes | string;

/**
 * Environment types the Python extension is aware of. Note this list is expected to shrink once tools have their
 * own separate extensions, in which case they're expected to provide the type themselves.
 */
export type KnownEnvironmentTypes = 'VirtualEnvironment' | 'Conda' | 'Unknown';

/**
 * Tool/plugin where the environment came from. It can be {@link KnownEnvironmentTools} or custom string which
 * was contributed.
 */
export type EnvironmentTools = KnownEnvironmentTools | string;
/**
 * Tools or plugins the Python extension currently has built-in support for. Note this list is expected to shrink
 * once tools have their own separate extensions.
 */
export type KnownEnvironmentTools = 'Conda' | 'Pipenv' | 'Poetry' | 'VirtualEnv' | 'Venv' | 'VirtualEnvWrapper' | 'Pyenv' | 'Unknown';

/**
 * Carries bitness for an environment.
 */
export type Bitness = '64-bit' | '32-bit' | 'Unknown';

/**
 * The possible Python release levels.
 */
export type PythonReleaseLevel = 'alpha' | 'beta' | 'candidate' | 'final';

/**
 * Release information for a Python version.
 */
export type PythonVersionRelease = {
  readonly level: PythonReleaseLevel;
  readonly serial: number;
};

export type VersionInfo = {
  readonly major: number | undefined;
  readonly minor: number | undefined;
  readonly micro: number | undefined;
  readonly release: PythonVersionRelease | undefined;
};

export type ResolvedVersionInfo = {
  readonly major: number;
  readonly minor: number;
  readonly micro: number;
  readonly release: PythonVersionRelease;
};

type Resource = Uri | undefined;
