import { Err, err, ok, Result } from 'neverthrow';
import { DbtProfile, DbtProfileType, ProfileYaml, TargetConfig } from './DbtProfile';
import { BIG_QUERY_PROFILES, PROFILE_METHODS } from './DbtProfileType';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { YamlParserUtils } from './YamlParserUtils';

export interface DbtProfileResult {
  type?: string;
  method?: string;
}

export interface DbtProfileError extends DbtProfileResult {
  message: string;
}

export interface DbtProfileSuccess extends DbtProfileResult {
  dbtProfile?: DbtProfile;
  targetConfig: Required<TargetConfig>;
}

type ProfileYamlValidated = {
  target: string;
  outputs: Record<string, Required<TargetConfig>>;
};

export class DbtProfileCreator {
  private profilesPath: string;

  constructor(private dbtProject: DbtProject, profilesPath: string) {
    this.profilesPath = YamlParserUtils.replaceTilde(profilesPath);
  }

  validateProfilesFile(profiles: unknown, profileName: string): Result<ProfileYamlValidated, DbtProfileError> {
    const profile = (profiles as Record<string, unknown>)[profileName] as ProfileYaml | undefined;
    if (!profile) {
      return err({ message: `Couldn't find credentials for profile '${profileName}'. Check your '${this.profilesPath}' file.` });
    }

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

    const { method } = outputsTarget;
    const authMethods = PROFILE_METHODS.get(type);
    if (authMethods && authMethods.length > 0 && (!method || authMethods.indexOf(method) === -1)) {
      return err({ message: `Unknown authentication method of '${type}' profile. Check your '${this.profilesPath}' file.`, type, method });
    }

    return ok(profile as ProfileYamlValidated);
  }

  createDbtProfile(): Result<DbtProfileSuccess, DbtProfileError> {
    let profiles: unknown = undefined;
    try {
      profiles = YamlParserUtils.parseYamlFile(this.profilesPath);
    } catch (e) {
      const message = `Failed to open and parse file '${this.profilesPath}'. ${e instanceof Error ? e.message : String(e)}`;
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

    const validationResult = this.validateProfilesFile(profiles, profileName);
    if (validationResult.isErr()) {
      console.log(validationResult.error);
      return err(validationResult.error);
    }

    const profile = validationResult.value;
    const { target } = profile;
    const targetConfig = profile.outputs[target];
    const { type, method } = targetConfig;

    let dbtProfile: DbtProfile | undefined = undefined;

    if (type.valueOf() === DbtProfileType.BigQuery) {
      const profileBuilder = BIG_QUERY_PROFILES.get(method);
      if (!profileBuilder) {
        return this.parseProfileError(`Unknown authentication method of '${type}' profile`, type, method);
      }
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
    });
  }

  cantFindSectionError(profileName: string, section: string, docsUrl?: string, type?: string, method?: string): Err<never, DbtProfileError> {
    const message = `Couldn't find section '${section}' for profile '${profileName}'. Check your '${this.profilesPath}' file. ${docsUrl ?? ''}`;
    console.log(message);
    return this.parseProfileError(message, type, method);
  }

  parseProfileError(message: string, type?: string, method?: string): Err<never, DbtProfileError> {
    return err({ message, type, method });
  }
}
