import path = require('path');
import { DbtRepository } from './DbtRepository';
import { YamlParserUtils } from './YamlParserUtils';

export class DbtProject {
  projectPath: string;
  parsedProject?: Record<string, unknown>;
  isDirty = true;

  constructor(projectPath: string) {
    this.projectPath = YamlParserUtils.replaceTilde(projectPath);
  }

  setDirty(): void {
    this.isDirty = true;
  }

  getProject(): Record<string, unknown> {
    if (this.isDirty || !this.parsedProject) {
      this.parsedProject = YamlParserUtils.parseYamlFile(path.resolve(this.projectPath, DbtRepository.DBT_PROJECT_FILE_NAME)) as Record<
        string,
        unknown
      >;
      this.isDirty = false;
    }
    return this.parsedProject;
  }

  findProjectName(): string | undefined {
    try {
      const dbtProject = this.getProject();
      const projectName = dbtProject[DbtRepository.DBT_PROJECT_NAME_FIELD];
      return projectName as string | undefined;
    } catch (e) {
      return undefined;
    }
  }

  findMacroPaths(): string[] {
    try {
      const dbtProject = this.getProject();
      const macroPaths = dbtProject[DbtRepository.MACRO_PATHS_FIELD];
      if (macroPaths !== undefined) {
        return macroPaths as string[];
      }
    } catch (e) {
      // do nothing
    }
    return DbtRepository.DEFAULT_MACRO_PATHS;
  }

  findModelPaths(): string[] {
    try {
      const dbtProject = this.getProject();

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

  findPackagesInstallPaths(): string[] {
    try {
      const dbtProject = this.getProject();
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

  findTargetPath(): string {
    try {
      const dbtProject = this.getProject();
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
  findProfileName(): string {
    const dbtProject = this.getProject();
    const profileName = dbtProject[DbtRepository.PROFILE_NAME_FIELD] as string | undefined;
    if (profileName === undefined) {
      throw new Error("'profile' field is missing");
    }
    console.log(`Profile name found: ${profileName}`);
    return profileName;
  }
}
