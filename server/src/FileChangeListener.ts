import { DidChangeWatchedFilesParams } from 'vscode-languageserver';
import { CompletionProvider } from './CompletionProvider';
import { DbtServer } from './DbtServer';
import { DefinitionProvider } from './DefinitionProvider';
import { ManifestParser } from './ManifestParser';
import { YamlParser } from './YamlParser';

export class FileChangeListener {
  dbtTargetPath?: string;

  constructor(
    private completionProvider: CompletionProvider,
    private definitionProvider: DefinitionProvider,
    private yamlParser: YamlParser,
    private manifestParser: ManifestParser,
    private dbtServer: DbtServer,
  ) {}

  onInit(): void {
    this.updateTargetPath();
    this.updateModels();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    for (const change of params.changes) {
      if (change.uri.endsWith(YamlParser.DBT_PROJECT_FILE_NAME)) {
        this.dbtServer.refreshServer();
        this.updateTargetPath();
        this.updateModels();
      } else if (change.uri.endsWith(`${this.resolveTargetPath()}/${YamlParser.DBT_MANIFEST_FILE_NAME}`)) {
        this.updateModels();
      }
    }
  }

  updateTargetPath(): void {
    this.dbtTargetPath = this.yamlParser.findTargetPath();
  }

  updateModels(): void {
    const { models } = this.manifestParser.parse(this.yamlParser.findTargetPath());
    this.completionProvider.setDbtModels(models);
    this.definitionProvider.setDbtModels(models);
  }

  resolveTargetPath(): string {
    return this.dbtTargetPath ?? YamlParser.DEFAULT_TARGET_PATH;
  }
}
