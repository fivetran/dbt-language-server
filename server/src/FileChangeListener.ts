import path = require('path');
import { DidChangeWatchedFilesParams, Emitter, Event } from 'vscode-languageserver';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { ManifestParser } from './manifest/ManifestParser';

export class FileChangeListener {
  private onDbtProjectYmlChangedEmitter = new Emitter<void>();

  constructor(
    private workspaceFolder: string,
    private dbtProject: DbtProject,
    private manifestParser: ManifestParser,
    private dbtRepository: DbtRepository,
  ) {}

  get onDbtProjectYmlChanged(): Event<void> {
    return this.onDbtProjectYmlChangedEmitter.event;
  }

  onInit(): void {
    this.updateDbtProjectConfig();
    this.updateManifestNodes();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    const dbtProjectYmlPath = path.resolve(this.workspaceFolder, DbtRepository.DBT_PROJECT_FILE_NAME);
    const manifestJsonPath = path.resolve(this.workspaceFolder, this.dbtRepository.dbtTargetPath, DbtRepository.DBT_MANIFEST_FILE_NAME);
    for (const change of params.changes) {
      if (change.uri.endsWith(dbtProjectYmlPath)) {
        this.onDbtProjectYmlChangedEmitter.fire();
        this.updateDbtProjectConfig();
        this.updateManifestNodes();
      } else if (change.uri.endsWith(manifestJsonPath)) {
        this.updateManifestNodes();
      }
    }
  }

  updateDbtProjectConfig(): void {
    const dbtProject = this.dbtProject.getProject();
    this.dbtRepository.dbtTargetPath = this.dbtProject.findTargetPath(dbtProject);
    this.dbtRepository.projectName = this.dbtProject.findProjectName(dbtProject);
    this.dbtRepository.macroPaths = this.dbtProject.findMacroPaths(dbtProject);
    this.dbtRepository.modelPaths = this.dbtProject.findModelPaths(dbtProject);
    this.dbtRepository.packagesInstallPaths = this.dbtProject.findPackagesInstallPaths(dbtProject);
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
}
