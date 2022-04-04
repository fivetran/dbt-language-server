import { ManifestMacro, ManifestModel, ManifestSource } from './manifest/ManifestJson';

export class DbtRepository {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';
  static readonly DBT_MANIFEST_FILE_NAME = 'manifest.json';
  static readonly DBT_PROJECT_NAME_FIELD = 'name';

  static readonly SOURCE_PATHS_FIELD = 'source-paths'; // v1.0.0: The config source-paths has been deprecated in favor of model-paths
  static readonly MODEL_PATHS_FIELD = 'model-paths';

  static readonly PACKAGES_INSTALL_PATH_FIELD = 'packages-install-path'; // v1.0.0: The default config has changed from modules-path to packages-install-path with a new default value of dbt_packages
  static readonly MODULE_PATH = 'module-path';

  static readonly TARGET_PATH_FIELD = 'target-path';
  static readonly DEFAULT_TARGET_PATH = './target';

  static readonly DEFAULT_MODEL_PATHS = ['models'];
  static readonly DEFAULT_PACKAGES_PATHS = ['dbt_packages', 'dbt_modules'];

  manifestExists = false;
  dbtTargetPath?: string;
  projectName?: string;
  modelPaths: string[] = DbtRepository.DEFAULT_MODEL_PATHS;
  packagesInstallPaths: string[] = DbtRepository.DEFAULT_PACKAGES_PATHS;
  models: ManifestModel[] = [];
  macros: ManifestMacro[] = [];
  sources: ManifestSource[] = [];
}
