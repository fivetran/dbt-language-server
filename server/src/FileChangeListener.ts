import { DidChangeWatchedFilesParams, Emitter, Event, FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { ManifestParser } from './manifest/ManifestParser';
import { debounce } from './utils/Utils';
import path = require('path');

export class FileChangeListener {
  private static PACKAGES_UPDATE_DEBOUNCE_TIMEOUT = 1000;

  private onDbtProjectYmlChangedEmitter = new Emitter<void>();
  private onDbtPackagesYmlChangedEmitter = new Emitter<FileChangeType>();
  private onDbtPackagesChangedEmitter = new Emitter<void>();

  private dbtProjectYmlPath: string;
  private packagesYmlPath: string;

  constructor(
    private workspaceFolder: string,
    private dbtProject: DbtProject,
    private manifestParser: ManifestParser,
    private dbtRepository: DbtRepository,
  ) {
    this.dbtProjectYmlPath = path.resolve(this.workspaceFolder, DbtRepository.DBT_PROJECT_FILE_NAME);
    this.packagesYmlPath = path.resolve(this.workspaceFolder, DbtRepository.DBT_PACKAGES_FILE_NAME);
  }

  get onDbtProjectYmlChanged(): Event<void> {
    return this.onDbtProjectYmlChangedEmitter.event;
  }

  get onDbtPackagesYmlChanged(): Event<FileChangeType> {
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
    const manifestJsonPath = path.resolve(this.workspaceFolder, this.dbtRepository.dbtTargetPath, DbtRepository.DBT_MANIFEST_FILE_NAME);
    const packagesPaths = this.dbtRepository.packagesInstallPaths.map(p => path.resolve(this.workspaceFolder, p));

    // For some paths we want to do action only once even we got several changes here
    if (this.containsChangeWithPath(params.changes, manifestJsonPath)) {
      this.updateManifestNodes();
    }

    for (const change of params.changes) {
      const changePath = URI.parse(change.uri).fsPath;
      if (changePath === this.dbtProjectYmlPath) {
        this.dbtProject.setParsedProjectOutdated();
        this.onDbtProjectYmlChangedEmitter.fire();
        this.updateDbtProjectConfig();
        this.updateManifestNodes();
      } else if (changePath === this.packagesYmlPath) {
        this.onDbtPackagesYmlChangedEmitter.fire(change.type);
      } else if (packagesPaths.some(p => changePath === p)) {
        this.debouncedDbtPackagesChangedEmitter();
      }
    }
  }

  containsChangeWithPath(changes: FileEvent[], fsPath: string): boolean {
    return (
      changes.find(c => {
        const changePath = URI.parse(c.uri).fsPath;
        return changePath === fsPath;
      }) !== undefined
    );
  }

  updateDbtProjectConfig(): void {
    this.dbtRepository.dbtTargetPath = path.normalize(this.dbtProject.findTargetPath());
    this.dbtRepository.projectName = this.dbtProject.findProjectName();
    this.dbtRepository.macroPaths = this.normalizePaths(this.dbtProject.findMacroPaths());
    this.dbtRepository.modelPaths = this.normalizePaths(this.dbtProject.findModelPaths());
    this.dbtRepository.packagesInstallPaths = this.normalizePaths(this.dbtProject.findPackagesInstallPaths());
  }

  normalizePaths(paths: string[]): string[] {
    return paths.map(p => path.normalize(p));
  }

  updateManifestNodes(): void {
    try {
      const { models, macros, sources } = this.manifestParser.parse(this.dbtProject.findTargetPath());
      console.log(`${ManifestParser.MANIFEST_FILE_NAME} was successfully parsed`);
      this.dbtRepository.updateDbtNodes(models, macros, sources);
    } catch (e) {
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
  }

  debouncedDbtPackagesChangedEmitter = debounce(() => {
    this.onDbtPackagesChangedEmitter.fire();
  }, FileChangeListener.PACKAGES_UPDATE_DEBOUNCE_TIMEOUT);
}
