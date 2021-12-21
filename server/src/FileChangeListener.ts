import { DidChangeWatchedFilesParams } from 'vscode-languageserver';
import { CompletionProvider } from './CompletionProvider';
import { YamlParser } from './YamlParser';
import { ManifestParser } from './ManifestParser';

export class FileChangeListener {
  dbtTargetPath?: string;

  constructor(private completionProvider: CompletionProvider, private yamlParser: YamlParser, private manifestParser: ManifestParser) {}

  onInit(): void {
    this.updateTargetPath();
    this.updateModels();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    for (const change of params.changes) {
      if (change.uri.endsWith(YamlParser.DBT_PROJECT_FILE_NAME)) {
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
    this.completionProvider.setDbtModels(this.manifestParser.getModels(this.resolveTargetPath()));
  }

  resolveTargetPath(): string {
    return this.dbtTargetPath ?? YamlParser.DEFAULT_TARGET_PATH;
  }
}
