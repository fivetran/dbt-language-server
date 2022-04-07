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

  private packageToModels: Map<string, ManifestModel[]> = new Map<string, ManifestModel[]>();
  private packageToMacros: Map<string, ManifestMacro[]> = new Map<string, ManifestMacro[]>();
  private packageToSources: Map<string, Map<string, ManifestSource[]>> = new Map<string, Map<string, ManifestSource[]>>();

  get packageToModelsMap(): Map<string, ManifestModel[]> {
    return this.packageToModels;
  }

  get packageToMacrosMap(): Map<string, ManifestMacro[]> {
    return this.packageToMacros;
  }

  get packageToSourcesMap(): Map<string, Map<string, ManifestSource[]>> {
    return this.packageToSources;
  }

  groupManifestNodes(): void {
    this.groupManifestModelNodes();
    this.groupManifestMacroNodes();
    this.groupManifestSourceNodes();
  }

  private groupManifestModelNodes(): void {
    for (const model of this.models) {
      let packageModels = this.packageToModels.get(model.packageName);
      if (!packageModels) {
        packageModels = [model];
        this.packageToModels.set(model.packageName, packageModels);
      } else {
        packageModels.push(model);
      }
    }
  }

  private groupManifestMacroNodes(): void {
    for (const macro of this.macros) {
      let packageMacros = this.packageToMacros.get(macro.packageName);
      if (!packageMacros) {
        packageMacros = [macro];
        this.packageToMacros.set(macro.packageName, packageMacros);
      } else {
        packageMacros.push(macro);
      }
    }
  }

  private groupManifestSourceNodes(): void {
    for (const source of this.sources) {
      let packageSources = this.packageToSources.get(source.packageName);
      if (!packageSources) {
        packageSources = new Map<string, ManifestSource[]>();
        this.packageToSources.set(source.packageName, packageSources);
      }

      let sourceTables = packageSources.get(source.sourceName);
      if (!sourceTables) {
        sourceTables = [source];
        packageSources.set(source.sourceName, sourceTables);
      } else {
        sourceTables.push(source);
      }
    }
  }
}
