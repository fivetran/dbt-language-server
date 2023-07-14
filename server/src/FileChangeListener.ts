import * as path from 'node:path';
import { DidChangeWatchedFilesParams, Emitter, Event, FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { DbtProject } from './DbtProject';
import { DbtRepository } from './DbtRepository';
import { ManifestParser } from './manifest/ManifestParser';

export class FileChangeListener {
  private onDbtPackagesYmlChangedEmitter = new Emitter<FileChangeType>();
  private onSqlModelChangedEmitter = new Emitter<FileEvent[]>();

  private dbtProjectYmlPath: string;
  private packagesYmlPath: string;

  constructor(
    private dbtProject: DbtProject,
    private manifestParser: ManifestParser,
    private dbtRepository: DbtRepository,
  ) {
    this.dbtProjectYmlPath = path.resolve(this.dbtRepository.projectPath, DbtRepository.DBT_PROJECT_FILE_NAME);
    this.packagesYmlPath = path.resolve(this.dbtRepository.projectPath, DbtRepository.DBT_PACKAGES_FILE_NAME);
  }

  get onDbtPackagesYmlChanged(): Event<FileChangeType> {
    return this.onDbtPackagesYmlChangedEmitter.event;
  }

  get onSqlModelChanged(): Event<FileEvent[]> {
    return this.onSqlModelChangedEmitter.event;
  }

  onInit(): void {
    this.updateDbtProjectConfig();
    this.updateManifestNodes();
  }

  onDidChangeWatchedFiles(params: DidChangeWatchedFilesParams): void {
    const sqlChanges = params.changes.filter(change => change.uri.endsWith('.sql'));
    if (sqlChanges.length > 0) {
      this.onSqlModelChangedEmitter.fire(sqlChanges);
    }

    params.changes = params.changes.filter(change => !change.uri.endsWith('.sql'));
    const manifestJsonPath = path.resolve(this.dbtRepository.projectPath, this.dbtRepository.dbtTargetPath, DbtRepository.DBT_MANIFEST_FILE_NAME);

    // For some paths we want to do action only once even we got several changes here
    if (this.containsChangeWithPath(params.changes, manifestJsonPath)) {
      this.updateManifestNodes();
    }

    for (const change of params.changes) {
      const changePath = URI.parse(change.uri).fsPath;
      if (changePath === this.dbtProjectYmlPath) {
        this.dbtProject.setParsedProjectOutdated();
        this.updateDbtProjectConfig();
        this.updateManifestNodes();
      } else if (changePath === this.packagesYmlPath) {
        this.onDbtPackagesYmlChangedEmitter.fire(change.type);
      }
    }
  }

  containsChangeWithPath(changes: FileEvent[], fsPath: string): boolean {
    return changes.some(c => URI.parse(c.uri).fsPath === fsPath);
  }

  updateDbtProjectConfig(): void {
    this.dbtRepository.dbtTargetPath = path.normalize(this.dbtProject.findTargetPath());
    this.dbtRepository.projectName = this.dbtProject.findProjectName();
    this.dbtRepository.macroPaths = this.normalizePaths(this.dbtProject.findMacroPaths());
    this.dbtRepository.modelPaths = this.normalizePaths(this.dbtProject.findModelPaths());
    this.dbtRepository.packagesInstallPath = path.normalize(this.dbtProject.findPackagesInstallPath());
  }

  normalizePaths(paths: string[]): string[] {
    return paths.map(p => path.normalize(p));
  }

  updateManifestNodes(): void {
    try {
      const parseResult = this.manifestParser.parse(this.dbtProject.findTargetPath());
      if (parseResult) {
        const { macros, sources, dag } = parseResult;
        this.dbtRepository.updateDbtNodes(macros, sources, dag);
        console.log('manifest.json was parsed. Models, macros, sources were updated');
      }
    } catch {
      console.log(`Failed to read ${ManifestParser.MANIFEST_FILE_NAME}`);
    }
  }
}
