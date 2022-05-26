import path = require('path');
import { DbtRepository } from './DbtRepository';
import { YamlParserUtils } from './YamlParserUtils';

export class DbtProject {
  projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = YamlParserUtils.replaceTilde(projectPath);
  }

  getProject(): Record<string, unknown> {
    return YamlParserUtils.parseYamlFile(path.resolve(this.projectPath, DbtRepository.DBT_PROJECT_FILE_NAME)) as Record<string, unknown>;
  }

  findProjectName(providedDbtProject?: Record<string, unknown>): string | undefined {
    try {
      const dbtProject = providedDbtProject ?? this.getProject();
      const projectName = dbtProject[DbtRepository.DBT_PROJECT_NAME_FIELD];
      return projectName as string | undefined;
    } catch (e) {
      return undefined;
    }
  }

  findMacroPaths(providedDbtProject?: Record<string, unknown>): string[] {
    try {
      const dbtProject = providedDbtProject ?? this.getProject();
      const macroPaths = dbtProject[DbtRepository.MACRO_PATHS_FIELD];
      if (macroPaths !== undefined) {
        return macroPaths as string[];
      }
    } catch (e) {
      // do nothing
    }
    return DbtRepository.DEFAULT_MACRO_PATHS;
  }

  findModelPaths(providedDbtProject?: Record<string, unknown>): string[] {
    try {
      const dbtProject = providedDbtProject ?? this.getProject();

      const modelPaths = dbtProject[DbtRepository.MODEL_PATHS_FIELD];
      if (modelPaths !== undefined) {
        return modelPaths as string[];
      }

      const sourcePaths = dbtProject[DbtRepository.SOURCE_PATHS_FIELD];
      if (sourcePaths !== undefined) {
        return sourcePaths as string[];
      }
    } catch (e) {
      // do nothing
    }
    return DbtRepository.DEFAULT_MODEL_PATHS;
  }

  findPackagesInstallPaths(providedDbtProject?: Record<string, unknown>): string[] {
    try {
      const dbtProject = providedDbtProject ?? this.getProject();
      const packagesInstallPath = dbtProject[DbtRepository.PACKAGES_INSTALL_PATH_FIELD];
      if (packagesInstallPath !== undefined) {
        return [packagesInstallPath as string];
      }

      const modulePath = dbtProject[DbtRepository.MODULE_PATH];
      if (modulePath !== undefined) {
        return [modulePath as string];
      }
    } catch (e) {
      // do nothing
    }
    return DbtRepository.DEFAULT_PACKAGES_PATHS;
  }

  findTargetPath(providedDbtProject?: Record<string, unknown>): string {
    try {
      const dbtProject = providedDbtProject ?? this.getProject();
      const targetPath = dbtProject[DbtRepository.TARGET_PATH_FIELD];
      if (targetPath !== undefined) {
        return targetPath as string;
      }
    } catch (e) {
      // do nothing
    }
    return DbtRepository.DEFAULT_TARGET_PATH;
  }

  /** In dbt package's dbt_project.yml profile may be missing */
  findProfileName(providedDbtProject?: Record<string, unknown>): string {
    const dbtProject = providedDbtProject ?? this.getProject();
    const profileName = dbtProject[DbtRepository.PROFILE_NAME_FIELD] as string | undefined;
    if (profileName === undefined) {
      throw new Error("'profile' field is missing");
    }
    console.log(`Profile name found: ${profileName}`);
    return profileName;
  }
}
