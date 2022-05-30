import path = require('path');
import { DidChangeWatchedFilesParams, Emitter, Event } from 'vscode-languageserver';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { ManifestParser } from './manifest/ManifestParser';
import { debounce } from './utils/Utils';

export class FileChangeListener {
  private static PACKAGES_UPDATE_DEBOUNCE_TIMEOUT = 1000;

  private onDbtProjectYmlChangedEmitter = new Emitter<void>();
  private onDbtPackagesYmlChangedEmitter = new Emitter<void>();
  private onDbtPackagesChangedEmitter = new Emitter<void>();

  constructor(
    private workspaceFolder: string,
    private dbtProject: DbtProject,
    private manifestParser: ManifestParser,
    private dbtRepository: DbtRepository,
  ) {}

  get onDbtProjectYmlChanged(): Event<void> {
    return this.onDbtProjectYmlChangedEmitter.event;
  }

  get onDbtPackagesYmlChanged(): Event<void> {
    return this.onDbtPackagesYmlChangedEmitter.event;
  }

  get onDbtPackagesChanged(): Event<void> {
    return this.onDbtPackagesChangedEmitter.event;
  }

  onInit(): void {
    this.updateDbtProjectConfig();
    this.updateManifestNodes();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    const dbtProjectYmlPath = path.resolve(this.workspaceFolder, DbtRepository.DBT_PROJECT_FILE_NAME);
    const manifestJsonPath = path.resolve(this.workspaceFolder, this.dbtRepository.dbtTargetPath, DbtRepository.DBT_MANIFEST_FILE_NAME);
    const packagesYmlPath = path.resolve(this.workspaceFolder, DbtRepository.DBT_PACKAGES_FILE_NAME);
    const packagesPaths = this.dbtRepository.packagesInstallPaths.map(p => path.resolve(this.workspaceFolder, p));

    for (const change of params.changes) {
      if (change.uri.endsWith(dbtProjectYmlPath)) {
        this.dbtProject.setParsedProjectOutdated();
        this.onDbtProjectYmlChangedEmitter.fire();
        this.updateDbtProjectConfig();
        this.updateManifestNodes();
      } else if (change.uri.endsWith(manifestJsonPath)) {
        this.updateManifestNodes();
      } else if (change.uri.endsWith(packagesYmlPath)) {
        this.onDbtPackagesYmlChangedEmitter.fire();
      } else if (packagesPaths.some(p => change.uri.includes(p))) {
        this.debouncedRefresh();
      }
    }
  }

  updateDbtProjectConfig(): void {
    this.dbtRepository.dbtTargetPath = this.dbtProject.findTargetPath();
    this.dbtRepository.projectName = this.dbtProject.findProjectName();
    this.dbtRepository.macroPaths = this.dbtProject.findMacroPaths();
    this.dbtRepository.modelPaths = this.dbtProject.findModelPaths();
    this.dbtRepository.packagesInstallPaths = this.dbtProject.findPackagesInstallPaths();
  }

  updateManifestNodes(): void {
    try {
      const { models, macros, sources } = this.manifestParser.parse(this.dbtProject.findTargetPath());
      console.log(`${ManifestParser.MANIFEST_FILE_NAME} was successfully parsed`);

      this.dbtRepository.updateDbtNodes(models, macros, sources);
      this.dbtRepository.manifestExists = true;
    } catch (e) {
      this.dbtRepository.manifestExists = false;
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
  }

  debouncedRefresh = debounce(() => {
    this.onDbtPackagesChangedEmitter.fire();
  }, FileChangeListener.PACKAGES_UPDATE_DEBOUNCE_TIMEOUT);
}
