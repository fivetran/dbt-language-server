import * as fs from 'fs';
import { err, ok, Result } from 'neverthrow';
import { DbtRepository } from '../DbtRepository';
import { getFilePathRelatedToWorkspace } from '../utils/Utils';
import { YamlParserUtils } from '../YamlParserUtils';
import { DbtDocumentKind } from './DbtDocumentKind';
import path = require('path');

export class DbtDocumentKindResolver {
  constructor(private dbtRepository: DbtRepository) {}

  getDbtDocumentKind(workspaceFolder: string, uri: string): DbtDocumentKind {
    const filePath = getFilePathRelatedToWorkspace(uri, workspaceFolder);

    if (this.dbtRepository.macroPaths.some(p => filePath.startsWith(p + path.sep))) {
      return DbtDocumentKind.MACRO;
    }
    if (this.dbtRepository.modelPaths.some(p => filePath.startsWith(p + path.sep))) {
      return DbtDocumentKind.MODEL;
    }

    if (this.dbtRepository.packagesInstallPaths.some(p => filePath.startsWith(p))) {
      const dbtPackageInfo = this.resolveDbtPackageInfo(workspaceFolder, filePath);
      if (dbtPackageInfo.isErr()) {
        console.log(dbtPackageInfo.error);
        return DbtDocumentKind.UNKNOWN;
      }
      const [dbtProjectRootPath, dbtProject] = dbtPackageInfo.value;

      const packageMacroPaths = (dbtProject[DbtRepository.MACRO_PATHS_FIELD] ?? DbtRepository.DEFAULT_MACRO_PATHS) as string[];
      const packageModelPaths = (dbtProject[DbtRepository.MODEL_PATHS_FIELD] ??
        dbtProject[DbtRepository.SOURCE_PATHS_FIELD] ??
        DbtRepository.DEFAULT_MODEL_PATHS) as string[];

      const pathRelativeToPackage = getFilePathRelatedToWorkspace(uri, dbtProjectRootPath);
      if (packageMacroPaths.some(p => pathRelativeToPackage.startsWith(p + path.sep))) {
        return DbtDocumentKind.MACRO;
      }
      if (packageModelPaths.some(p => pathRelativeToPackage.startsWith(p + path.sep))) {
        return DbtDocumentKind.MODEL;
      }
    }

    return DbtDocumentKind.UNKNOWN;
  }

  resolveDbtPackageInfo(workspaceFolder: string, filePath: string): Result<[string, any], string> {
    let currentPath = path.resolve(workspaceFolder, filePath);
    do {
      currentPath = path.resolve(currentPath, '..');
      try {
        fs.statSync(path.resolve(currentPath, DbtRepository.DBT_PROJECT_FILE_NAME));
        break;
      } catch (e) {
        // file does not exist
      }
    } while (currentPath !== workspaceFolder);

    if (currentPath === workspaceFolder) {
      return err('Dbt package root folder not found');
    }

    try {
      return ok([currentPath, YamlParserUtils.parseYamlFile(path.resolve(currentPath, DbtRepository.DBT_PROJECT_FILE_NAME))]);
    } catch (e) {
      return err('Unable to parse dbt package config');
    }
  }
}
