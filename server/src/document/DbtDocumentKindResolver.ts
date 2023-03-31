import * as fs from 'node:fs';
import * as path from 'node:path';
import { DbtProject } from '../DbtProject';
import { DbtRepository } from '../DbtRepository';
import { getFilePathRelatedToWorkspace } from '../utils/Utils';
import { DbtDocumentKind } from './DbtDocumentKind';

export class DbtDocumentKindResolver {
  constructor(private dbtRepository: DbtRepository) {}

  getDbtDocumentKind(uri: string): DbtDocumentKind {
    const filePath = getFilePathRelatedToWorkspace(uri, this.dbtRepository.projectPath);

    if (filePath.startsWith(this.dbtRepository.packagesInstallPath)) {
      const dbtPackagePath = this.resolveDbtPackagePath(this.dbtRepository.projectPath, filePath);
      if (!dbtPackagePath) {
        console.log('Dbt package root folder not found');
        return DbtDocumentKind.UNKNOWN;
      }

      const dbtPackageProject = new DbtProject(dbtPackagePath);
      const pathRelativeToPackage = getFilePathRelatedToWorkspace(uri, dbtPackagePath);

      return this.resolveDbtDocumentKind(dbtPackageProject.findMacroPaths(), dbtPackageProject.findModelPaths(), pathRelativeToPackage);
    }

    return this.resolveDbtDocumentKind(this.dbtRepository.macroPaths, this.dbtRepository.modelPaths, filePath);
  }

  resolveDbtDocumentKind(macroPaths: string[], modelPaths: string[], fileRelativePath: string): DbtDocumentKind {
    if (macroPaths.some(p => fileRelativePath.startsWith(p + path.sep))) {
      return DbtDocumentKind.MACRO;
    }
    if (modelPaths.some(p => fileRelativePath.startsWith(p + path.sep))) {
      return DbtDocumentKind.MODEL;
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
      } catch {
        // file does not exist
      }
    } while (currentPath !== workspaceFolder);

    if (currentPath === workspaceFolder) {
      return undefined;
    }

    return currentPath;
  }
}
