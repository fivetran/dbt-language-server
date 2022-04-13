import { ManifestMacro, ManifestModel, ManifestSource } from './manifest/ManifestJson';

export class DbtRepository {
  static readonly DBT_PROJECT_FILE_NAME = 'dbt_project.yml';
  static readonly DBT_MANIFEST_FILE_NAME = 'manifest.json';
  static readonly DBT_PROJECT_NAME_FIELD = 'name';

  static readonly MACRO_PATHS_FIELD = 'macro-paths';
  static readonly SOURCE_PATHS_FIELD = 'source-paths'; // v1.0.0: The config source-paths has been deprecated in favor of model-paths
  static readonly MODEL_PATHS_FIELD = 'model-paths';

  static readonly PACKAGES_INSTALL_PATH_FIELD = 'packages-install-path'; // v1.0.0: The default config has changed from modules-path to packages-install-path with a new default value of dbt_packages
  static readonly MODULE_PATH = 'module-path';

  static readonly TARGET_PATH_FIELD = 'target-path';
  static readonly DEFAULT_TARGET_PATH = './target';

  static readonly DEFAULT_MACRO_PATHS = ['macros'];
  static readonly DEFAULT_MODEL_PATHS = ['models'];
  static readonly DEFAULT_PACKAGES_PATHS = ['dbt_packages', 'dbt_modules'];

  manifestExists = false;
  dbtTargetPath?: string;
  projectName?: string;
  macroPaths: string[] = DbtRepository.DEFAULT_MACRO_PATHS;
  modelPaths: string[] = DbtRepository.DEFAULT_MODEL_PATHS;
  packagesInstallPaths: string[] = DbtRepository.DEFAULT_PACKAGES_PATHS;

  models: ManifestModel[] = [];
  macros: ManifestMacro[] = [];
  sources: ManifestSource[] = [];

  packageToModels = new Map<string, Set<ManifestModel>>();
  packageToMacros = new Map<string, Set<ManifestMacro>>();
  packageToSources = new Map<string, Map<string, Set<ManifestSource>>>();

  updateDbtNodes(models: ManifestModel[], macros: ManifestMacro[], sources: ManifestSource[]): void {
    this.models = models;
    this.macros = macros;
    this.sources = sources;

    this.clearManifestNodes();
    this.groupManifestNodes();
  }

  private clearManifestNodes(): void {
    this.packageToModels.clear();
    this.packageToMacros.clear();
    this.packageToSources.clear();
  }

  private groupManifestNodes(): void {
    this.groupManifestModelNodes();
    this.groupManifestMacroNodes();
    this.groupManifestSourceNodes();
  }

  private groupManifestModelNodes(): void {
    for (const model of this.models) {
      let packageModels = this.packageToModels.get(model.packageName);
      if (!packageModels) {
        packageModels = new Set();
        this.packageToModels.set(model.packageName, packageModels);
      }
      packageModels.add(model);
    }
  }

  private groupManifestMacroNodes(): void {
    for (const macro of this.macros) {
      let packageMacros = this.packageToMacros.get(macro.packageName);
      if (!packageMacros) {
        packageMacros = new Set();
        this.packageToMacros.set(macro.packageName, packageMacros);
      }
      packageMacros.add(macro);
    }
  }

  private groupManifestSourceNodes(): void {
    for (const source of this.sources) {
      let packageSources = this.packageToSources.get(source.packageName);
      if (!packageSources) {
        packageSources = new Map<string, Set<ManifestSource>>();
        this.packageToSources.set(source.packageName, packageSources);
      }

      let sourceTables = packageSources.get(source.sourceName);
      if (!sourceTables) {
        sourceTables = new Set();
        packageSources.set(source.sourceName, sourceTables);
      }
      sourceTables.add(source);
    }
  }
}
