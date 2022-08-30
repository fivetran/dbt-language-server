import * as fs from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'yaml';
import { DbtRepository } from './DbtRepository';
import { YamlParserUtils } from './YamlParserUtils';

export class DbtProject {
  parsedProject?: Record<string, unknown>;
  isParsedProjectOutdated = true;

  constructor(private projectPath: string) {}

  setParsedProjectOutdated(): void {
    this.isParsedProjectOutdated = true;
  }

  getProject(): Record<string, unknown> {
    if (this.isParsedProjectOutdated || !this.parsedProject) {
      this.parsedProject = YamlParserUtils.parseYamlFile(path.resolve(this.projectPath, DbtRepository.DBT_PROJECT_FILE_NAME)) as Record<
        string,
        unknown
      >;
      this.isParsedProjectOutdated = false;
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

  addNewDbtPackage(packageName: string, version: string): void {
    const filePath = path.resolve(this.projectPath, DbtRepository.DBT_PACKAGES_FILE_NAME);

    let content = undefined;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      content = '';
    }

    const parsedYaml = (yaml.parse(content, { uniqueKeys: false }) as Record<string, unknown> | null | undefined) ?? {};

    let packages = parsedYaml['packages'] as Record<string, unknown>[] | null | undefined;
    if (!packages) {
      packages = [];
      parsedYaml['packages'] = packages;
    }

    const packageObject = packages.find(p => p['package'] === packageName);
    if (packageObject) {
      packageObject['version'] = version;
    } else {
      packages.push({
        package: packageName,
        version,
      });
    }

    fs.writeFileSync(filePath, yaml.stringify(parsedYaml));
  }
}
