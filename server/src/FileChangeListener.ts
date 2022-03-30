import { DidChangeWatchedFilesParams, Emitter, Event } from 'vscode-languageserver';
import { DbtRepository } from './DbtRepository';
import { ManifestParser } from './manifest/ManifestParser';
import { YamlParser } from './YamlParser';

export class FileChangeListener {
  private onDbtProjectYmlChangedEmitter = new Emitter<void>();

  constructor(private yamlParser: YamlParser, private manifestParser: ManifestParser, private dbtRepository: DbtRepository) {}

  get onDbtProjectYmlChanged(): Event<void> {
    return this.onDbtProjectYmlChangedEmitter.event;
  }

  onInit(): void {
    this.updateDbtProjectConfig();
    this.updateManifestNodes();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    for (const change of params.changes) {
      if (change.uri.endsWith(YamlParser.DBT_PROJECT_FILE_NAME)) {
        this.onDbtProjectYmlChangedEmitter.fire();
        this.updateDbtProjectConfig();
        this.updateManifestNodes();
      } else if (change.uri.endsWith(`${this.resolveTargetPath()}/${YamlParser.DBT_MANIFEST_FILE_NAME}`)) {
        this.updateManifestNodes();
      }
    }
  }

  updateDbtProjectConfig(): void {
    this.dbtRepository.dbtTargetPath = this.yamlParser.findTargetPath();
    this.dbtRepository.projectName = this.yamlParser.findProjectName();
    this.dbtRepository.modelPaths = this.yamlParser.findModelPaths();
  }

  updateManifestNodes(): void {
    try {
      const { models, macros, sources } = this.manifestParser.parse(this.yamlParser.findTargetPath());
      this.dbtRepository.models = models;
      this.dbtRepository.macros = macros;
      this.dbtRepository.sources = sources;
      this.dbtRepository.manifestExists = true;
    } catch (e) {
      this.dbtRepository.manifestExists = false;
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
  }

  resolveTargetPath(): string {
    return this.dbtRepository.dbtTargetPath ?? YamlParser.DEFAULT_TARGET_PATH;
  }
}
