import { DbtRepository } from '../DbtRepository';
import { getFilePathRelatedToWorkspace } from '../utils/Utils';
import { YamlParser } from '../YamlParser';
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
        return DbtDocumentKind.UNKNOWN;
      }

      try {
        const dbtProject = YamlParser.parseYamlFile(path.resolve(currentPath, DbtRepository.DBT_PROJECT_FILE_NAME));

        const packageMacroPaths = (dbtProject[DbtRepository.MACRO_PATHS_FIELD] ?? DbtRepository.DEFAULT_MACRO_PATHS) as string[];
        const packageModelPaths = (dbtProject[DbtRepository.MODEL_PATHS_FIELD] ??
          dbtProject[DbtRepository.SOURCE_PATHS_FIELD] ??
          DbtRepository.DEFAULT_MODEL_PATHS) as string[];

        const pathRelativeToPackage = getFilePathRelatedToWorkspace(uri, currentPath);
        if (packageMacroPaths.some(p => pathRelativeToPackage.startsWith(p + path.sep))) {
          return DbtDocumentKind.MACRO;
        }
        if (packageModelPaths.some(p => pathRelativeToPackage.startsWith(p + path.sep))) {
          return DbtDocumentKind.MODEL;
        }
      } catch (e) {
        return DbtDocumentKind.UNKNOWN;
      }
    }

    return DbtDocumentKind.UNKNOWN;
  }
}
