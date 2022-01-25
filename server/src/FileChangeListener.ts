import { DidChangeWatchedFilesParams } from 'vscode-languageserver';
import { CompletionProvider } from './CompletionProvider';
import { DbtRpcServer } from './DbtRpcServer';
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
    private dbtRpcServer: DbtRpcServer,
  ) {}

  onInit(): void {
    this.updateTargetPath();
    this.updateManifestNodes();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    for (const change of params.changes) {
      if (change.uri.endsWith(YamlParser.DBT_PROJECT_FILE_NAME)) {
        this.dbtRpcServer.refreshServer();
        this.updateTargetPath();
        this.updateProjectName();
        this.updateManifestNodes();
      } else if (change.uri.endsWith(`${this.resolveTargetPath()}/${YamlParser.DBT_MANIFEST_FILE_NAME}`)) {
        this.updateProjectName();
        this.updateManifestNodes();
      }
    }
  }

  updateTargetPath(): void {
    this.dbtTargetPath = this.yamlParser.findTargetPath();
  }

  updateProjectName(): void {
    this.definitionProvider.setProjectName(this.yamlParser.findProjectName());
  }

  updateManifestNodes(): void {
    const { models, macros } = this.manifestParser.parse(this.yamlParser.findTargetPath());
    this.completionProvider.setDbtModels(models);
    this.definitionProvider.setDbtModels(models);
    this.definitionProvider.setDbtMacros(macros);
  }

  resolveTargetPath(): string {
    return this.dbtTargetPath ?? YamlParser.DEFAULT_TARGET_PATH;
  }
}
