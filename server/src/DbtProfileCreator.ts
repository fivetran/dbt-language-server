import { Err, err, ok, Result } from 'neverthrow';
import { URI } from 'vscode-uri';
import { DbtProfile, ProfileYaml, TargetConfig, SupportedProfileName } from './DbtProfile';
import { BIG_QUERY_PROFILES, PROFILE_METHODS, SNOWFLAKE_PROFILES } from './DbtProfileType';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { evalProfilesYmlJinjaEnvVar } from './utils/JinjaUtils';
import { YamlParserUtils } from './YamlParserUtils';

export interface DbtProfileInfo {
  type?: string;
  method?: string;
  project?: string;
  dataset?: string;
}

interface DbtProfileError extends DbtProfileInfo {
  message: string;
}

export interface DbtProfileSuccess extends DbtProfileInfo {
  dbtProfile?: DbtProfile;
  targetConfig: Required<TargetConfig>;
}

type ProfileYamlValidated = {
  target: string;
  outputs: Record<string, Required<TargetConfig>>;
};

export class DbtProfileCreator {
  constructor(
    private dbtProject: DbtProject,
    private profilesYmlPath: string,
  ) {}

  validateCommonProfileFields(profile: ProfileYaml, profileName: string): Result<ProfileYamlValidated, DbtProfileError> {
    const { target } = profile;
    if (!target) {
      return this.cantFindSectionError(profileName, 'target');
    }

    const { outputs } = profile;
    if (!outputs) {
      return this.cantFindSectionError(profileName, 'outputs');
    }

    const outputsTarget = outputs[target];
    if (!outputsTarget) {
      return this.cantFindSectionError(profileName, `outputs.${target}`);
    }

    const { type } = outputsTarget;
    if (!type) {
      return this.cantFindSectionError(profileName, `outputs.${target}.type`);
    }

    const method = outputsTarget.method ? String(evalProfilesYmlJinjaEnvVar(outputsTarget.method)) : undefined;
    const authMethods = PROFILE_METHODS.get(type);
    if (authMethods && (!method || !authMethods.includes(method))) {
      return err({
        message: `Unknown authentication method of '${type}' profile. Check your [${this.profilesYmlPath}](${URI.file(
          this.profilesYmlPath,
        ).toString()}) file.`,
        type,
        method,
        project: outputsTarget.project,
        dataset: outputsTarget.dataset,
      });
    }

    return ok(profile as ProfileYamlValidated);
  }

  createDbtProfile(): Result<DbtProfileSuccess, DbtProfileError> {
    let profiles: unknown = undefined;
    try {
      profiles = YamlParserUtils.parseYamlFile(this.profilesYmlPath);
    } catch (e) {
      const message = `Failed to open and parse file '${this.profilesYmlPath}'. ${e instanceof Error ? e.message : String(e)}`;
      console.log(message);
      return err({ message });
    }

    let profileName = undefined;
    try {
      profileName = this.dbtProject.findProfileName();
    } catch (e) {
      const message = `Failed to find profile name in ${process.cwd()}/${DbtRepository.DBT_PROJECT_FILE_NAME}. ${
        e instanceof Error ? e.message : String(e)
      }`;
      console.log(message);
      return err({ message });
    }

    const rawProfile = profiles ? ((profiles as Record<string, unknown>)[profileName] as ProfileYaml | undefined) : undefined;
    if (!rawProfile) {
      return err({
        message: `Couldn't find credentials for profile '${profileName}'. Check your [${this.profilesYmlPath}](${URI.file(
          this.profilesYmlPath,
        ).toString()}) file.`,
      });
    }

    const validationResult = this.validateCommonProfileFields(rawProfile, profileName);
    if (validationResult.isErr()) {
      console.log(validationResult.error);
      return err(validationResult.error);
    }
    const profileWithValidatedFields = validationResult.value;

    const target = String(evalProfilesYmlJinjaEnvVar(profileWithValidatedFields.target));
    const targetConfig = DbtProfileCreator.evalTargetConfig(profileWithValidatedFields.outputs[target]) as Required<TargetConfig>;
    const { type } = targetConfig;
    let { method } = targetConfig;

    let dbtProfile: DbtProfile | undefined = undefined;

    let profileBuilder = undefined;

    if (type === SupportedProfileName.BigQuery) {
      profileBuilder = method ? BIG_QUERY_PROFILES.get(method) : undefined;
      if (!profileBuilder) {
        return this.parseProfileError(`Unknown authentication method of '${type}' profile`, type, method);
      }
    } else if (type === SupportedProfileName.Snowflake) {
      if (targetConfig.account && targetConfig.password) {
        profileBuilder = SNOWFLAKE_PROFILES.get('user-password');
        method = 'user-password';
      } else if (targetConfig.account && targetConfig.private_key_path) {
        profileBuilder = SNOWFLAKE_PROFILES.get('key-pair');
        method = 'key-pair';
      }
    }

    if (profileBuilder) {
      dbtProfile = profileBuilder();
      const result = dbtProfile.validateProfile(targetConfig);
      if (result.isErr()) {
        const docsUrl = dbtProfile.getDocsUrl();
        return this.cantFindSectionError(profileName, result.error, docsUrl, type, method);
      }
    }

    return ok({
      dbtProfile,
      targetConfig,
      type,
      method,
      project: targetConfig.project,
      dataset: targetConfig.dataset,
    });
  }

  static evalTargetConfig(targetConfig: { [index: string]: unknown }): { [index: string]: unknown } {
    Object.entries(targetConfig).forEach(([key, value]) => {
      if (typeof value === 'string') {
        targetConfig[key] = evalProfilesYmlJinjaEnvVar(value);
      } else if (typeof value === 'object' && value !== null) {
        targetConfig[key] = DbtProfileCreator.evalTargetConfig(value as { [index: string]: unknown });
      }
    });
    return targetConfig;
  }

  cantFindSectionError(profileName: string, section: string, docsUrl?: string, type?: string, method?: string): Err<never, DbtProfileError> {
    const message = `Couldn't find section '${section}' for profile '${profileName}'. Check your [${this.profilesYmlPath}](${URI.file(
      this.profilesYmlPath,
    ).toString()}) file. ${docsUrl ?? ''}`;
    console.log(message);
    return this.parseProfileError(message, type, method);
  }

  parseProfileError(message: string, type?: string, method?: string): Err<never, DbtProfileError> {
    return err({ message, type, method });
  }
}
