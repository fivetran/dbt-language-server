import * as fs from 'fs';
import { DbtProject } from '../DbtProject';
import { DbtRepository } from '../DbtRepository';
import { getFilePathRelatedToWorkspace } from '../utils/Utils';
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
      const dbtPackagePath = this.resolveDbtPackagePath(workspaceFolder, filePath);
      if (!dbtPackagePath) {
        console.log('Dbt package root folder not found');
        return DbtDocumentKind.UNKNOWN;
      }

      const dbtPackageProject = new DbtProject(dbtPackagePath);
      const packageMacroPaths = dbtPackageProject.findMacroPaths();
      const packageModelPaths = dbtPackageProject.findModelPaths();

      const pathRelativeToPackage = getFilePathRelatedToWorkspace(uri, dbtPackagePath);
      if (packageMacroPaths.some(p => pathRelativeToPackage.startsWith(p + path.sep))) {
        return DbtDocumentKind.MACRO;
      }
      if (packageModelPaths.some(p => pathRelativeToPackage.startsWith(p + path.sep))) {
        return DbtDocumentKind.MODEL;
      }
    }

    return DbtDocumentKind.UNKNOWN;
  }

  resolveDbtPackagePath(workspaceFolder: string, filePath: string): string | undefined {
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
      return undefined;
    }

    return currentPath;
  }
}
