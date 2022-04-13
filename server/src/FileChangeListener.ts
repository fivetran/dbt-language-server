import path = require('path');
import { DidChangeWatchedFilesParams, Emitter, Event } from 'vscode-languageserver';
import { DbtRepository } from './DbtRepository';
import { ManifestParser } from './manifest/ManifestParser';
import { YamlParser } from './YamlParser';

export class FileChangeListener {
  private onDbtProjectYmlChangedEmitter = new Emitter<void>();

  constructor(
    private workspaceFolder: string,
    private yamlParser: YamlParser,
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
    console.log(`onDidChangeWatchedFiles: ${params.changes.length} changes, ${params.changes[0].uri}`);
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
    this.dbtRepository.dbtTargetPath = this.yamlParser.findTargetPath();
    this.dbtRepository.projectName = this.yamlParser.findProjectName();
    this.dbtRepository.modelPaths = this.yamlParser.findModelPaths();
    this.dbtRepository.packagesInstallPaths = this.yamlParser.findPackagesInstallPaths();
  }

  updateManifestNodes(): void {
    try {
      const { models, macros, sources } = this.manifestParser.parse(this.yamlParser.findTargetPath());
      console.log(
        `Current state: ${this.dbtRepository.models.length} models, ${this.dbtRepository.macros.length} macros, ${this.dbtRepository.sources.length} sources`,
      );
      console.log(`updateManifestNodes: ${models.length} models, ${macros.length} macros, ${sources.length} sources`);
      this.dbtRepository.updateDbtNodes(models, macros, sources);
      this.dbtRepository.manifestExists = true;
    } catch (e) {
      this.dbtRepository.manifestExists = false;
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
  }
}
