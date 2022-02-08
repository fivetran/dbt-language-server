import { DidChangeWatchedFilesParams, Emitter, Event } from 'vscode-languageserver';
import { ManifestMacro, ManifestModel, ManifestSource } from './manifest/ManifestJson';
import { ManifestParser } from './manifest/ManifestParser';
import { YamlParser } from './YamlParser';

export class FileChangeListener {
  private onDbtProjectYmlChangedEmitter = new Emitter<void>();
  private onProjectNameChangedEmitter = new Emitter<string | undefined>();
  private onModelsChangedEmitter = new Emitter<ManifestModel[]>();
  private onMacrosChangedEmitter = new Emitter<ManifestMacro[]>();
  private onSourcesChangedEmitter = new Emitter<ManifestSource[]>();

  dbtTargetPath?: string;
  manifestExists = false;

  constructor(private yamlParser: YamlParser, private manifestParser: ManifestParser) {}

  get onDbtProjectYmlChanged(): Event<void> {
    return this.onDbtProjectYmlChangedEmitter.event;
  }

  get onProjectNameChanged(): Event<string | undefined> {
    return this.onProjectNameChangedEmitter.event;
  }

  get onModelsChanged(): Event<ManifestModel[]> {
    return this.onModelsChangedEmitter.event;
  }

  get onMacrosChanged(): Event<ManifestMacro[]> {
    return this.onMacrosChangedEmitter.event;
  }

  get onSourcesChanged(): Event<ManifestSource[]> {
    return this.onSourcesChangedEmitter.event;
  }

  onInit(): void {
    this.updateTargetPath();
    this.updateProjectName();
    this.updateManifestNodes();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    for (const change of params.changes) {
      if (change.uri.endsWith(YamlParser.DBT_PROJECT_FILE_NAME)) {
        this.onDbtProjectYmlChangedEmitter.fire();
        this.updateTargetPath();
        this.updateProjectName();
        this.updateManifestNodes();
      } else if (change.uri.endsWith(`${this.resolveTargetPath()}/${YamlParser.DBT_MANIFEST_FILE_NAME}`)) {
        this.updateManifestNodes();
      }
    }
  }

  updateTargetPath(): void {
    this.dbtTargetPath = this.yamlParser.findTargetPath();
  }

  updateProjectName(): void {
    this.onProjectNameChangedEmitter.fire(this.yamlParser.findProjectName());
  }

  updateManifestNodes(): void {
    try {
      const { models, macros, sources } = this.manifestParser.parse(this.yamlParser.findTargetPath());
      this.onModelsChangedEmitter.fire(models);
      this.onMacrosChangedEmitter.fire(macros);
      this.onSourcesChangedEmitter.fire(sources);
      this.manifestExists = true;
    } catch (e) {
      this.manifestExists = false;
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`, e);
    }
  }

  resolveTargetPath(): string {
    return this.dbtTargetPath ?? YamlParser.DEFAULT_TARGET_PATH;
  }
}
