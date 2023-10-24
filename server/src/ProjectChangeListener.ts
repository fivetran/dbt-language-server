import { Diagnostic, FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { DbtRepository } from './DbtRepository';
import { DestinationContext } from './DestinationContext';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { FileChangeListener } from './FileChangeListener';
import { MacroCompilationServer } from './MacroCompilationServer';
import { DagNodeFetcher } from './ModelFetcher';
import { NotificationSender } from './NotificationSender';
import { ProjectAnalyzeResults } from './ProjectAnalyzeResults';
import { ModelsAnalyzeResult } from './ProjectAnalyzer';
import { ProjectProgressReporter } from './ProjectProgressReporter';
import { DbtCli } from './dbt_execution/DbtCli';
import { DbtTextDocument } from './document/DbtTextDocument';
import { DBT_DEPS_REQUIRED_ERROR_PART } from './utils/Constants';
import { debounce } from './utils/Utils';
import path = require('node:path');

interface CurrentDbtError {
  uri: string;
  error: string;
}

export class ProjectChangeListener {
  private static PROJECT_COMPILE_DEBOUNCE_TIMEOUT = 1000;

  currentDbtError?: CurrentDbtError;

  constructor(
    private openedDocumentsLowerCase: Map<string, DbtTextDocument>,
    private destinationContext: DestinationContext,
    private dbtRepository: DbtRepository,
    private diagnosticGenerator: DiagnosticGenerator,
    private notificationSender: NotificationSender,
    private dbtCli: DbtCli,
    private fileChangeListener: FileChangeListener,
    private projectProgressReporter: ProjectProgressReporter,
    private macroCompilationServer: MacroCompilationServer,
    private projectAnalyzeResults: ProjectAnalyzeResults,
  ) {
    fileChangeListener.onSqlModelChanged(c => this.onSqlModelChanged(c));
    fileChangeListener.onPackagesFolderChanged(() => this.onPackagesFolderChanged());
  }

  updateManifest(): void {
    this.fileChangeListener.updateManifestNodes();
  }

  async compileAndAnalyzeProject(): Promise<void> {
    this.dbtCli.cancelCompileProject();
    this.destinationContext.cancelAnalyze();
    this.macroCompilationServer.cancelActiveTasks();

    console.log('Starting to recompile/reanalyze the project');
    this.projectProgressReporter.sendAnalyzeBegin();
    this.projectProgressReporter.sendAnalyzeProgressMessage('dbt compile', 0);
    if (!this.destinationContext.isEmpty()) {
      this.notificationSender.clearAllDiagnostics();
    }

    // We should reset catalog before compiling the project, because the catalog will start to re-fill during compilation
    this.destinationContext.resetCache();
    const compileResult = await this.dbtCli.compileProject(this.dbtRepository);
    if (compileResult.isOk()) {
      this.clearDbtError();
      this.updateManifest();
      try {
        await this.analyzeProject();
      } catch (e) {
        if (e === 'Canceled') {
          console.log('Project analysis canceled');
          return;
        }
        console.log(`Error while analyzing project: ${e instanceof Error ? e.message : String(e)}`);
      }
    } else {
      if (compileResult.error === 'Canceled') {
        return;
      }
      this.setDbtError(this.getAnyDbtProjectYmlUri(), compileResult.error);
    }
    this.projectProgressReporter.sendAnalyzeEnd();
  }

  setDbtError(activeDocumentUri: string, error: string | undefined): void {
    if (error) {
      const diagnosticsInfo = this.diagnosticGenerator.getDbtErrorDiagnostics(error);

      const newUri = diagnosticsInfo[1] ?? activeDocumentUri;
      if (this.currentDbtError && newUri !== this.currentDbtError.uri) {
        this.notificationSender.clearDiagnostics(this.currentDbtError.uri);
      }
      this.currentDbtError = { uri: newUri, error };
      this.notificationSender.sendDiagnostics(this.currentDbtError.uri, diagnosticsInfo[0], []);
    } else {
      this.clearDbtError();
    }
  }

  clearDbtError(): void {
    if (this.currentDbtError) {
      this.notificationSender.clearDiagnostics(this.currentDbtError.uri);
      this.currentDbtError = undefined;
    }
  }

  getAnyDbtProjectYmlUri(): string {
    return URI.file(path.join(this.dbtRepository.projectPath, 'dbt_project.yml')).toString();
  }

  forceCompileAndAnalyzeProject(): void {
    this.debouncedCompileAndAnalyze();
  }

  /** Analyses model tree, sends diagnostics for the entire tree and returns diagnostics for root model */
  async analyzeModelTree(rawDocUri: string, sql: string): Promise<ModelsAnalyzeResult | undefined> {
    const { fsPath } = URI.parse(rawDocUri);
    const modelFetcher = new DagNodeFetcher(this.dbtRepository, fsPath);
    const node = await modelFetcher.getDagNode();
    let mainModelResult: ModelsAnalyzeResult | undefined;

    if (node) {
      const results = await this.destinationContext.analyzeModelTree(node, sql, new AbortController().signal);
      this.sendDiagnosticsForDocuments(results.filter(r => r.modelUniqueId !== node.getValue().uniqueId));
      mainModelResult = results.find(r => r.modelUniqueId === node.getValue().uniqueId);
    } else {
      const analyzeResult = await this.destinationContext.analyzeSql(sql, new AbortController().signal);
      mainModelResult = { modelUniqueId: '', analyzeResult };
    }
    return mainModelResult;
  }

  private onSqlModelChanged(changes: FileEvent[]): void {
    const externalChangeHappened = changes.some(c => c.type !== FileChangeType.Deleted && !this.openedDocumentsLowerCase.has(c.uri.toLowerCase()));
    if (externalChangeHappened) {
      this.debouncedCompileAndAnalyze();
    }
  }

  private onPackagesFolderChanged(): void {
    if (this.isDbtDepsRequiredErrorExist()) {
      this.debouncedCompileAndAnalyze();
    }
  }

  private isDbtDepsRequiredErrorExist(): boolean {
    return Boolean(this.currentDbtError?.error.includes(DBT_DEPS_REQUIRED_ERROR_PART));
  }

  private debouncedCompileAndAnalyze = debounce(() => {
    this.compileAndAnalyzeProject().catch(e => console.log(`Error while compiling/analyzing project: ${e instanceof Error ? e.message : String(e)}`));
  }, ProjectChangeListener.PROJECT_COMPILE_DEBOUNCE_TIMEOUT);

  private async analyzeProject(): Promise<void> {
    if (this.destinationContext.isEmpty()) {
      return;
    }
    const results = await this.destinationContext.analyzeProject((completedCount: number, modelsCount: number) => {
      this.projectProgressReporter.sendAnalyzeProgress(completedCount, modelsCount);
    });
    this.projectAnalyzeResults.update(results);
    this.sendDiagnosticsForDocuments(results);
    console.log(`Processed ${results.length} models. ${results.filter(r => r.analyzeResult.ast.isErr()).length} errors found during analysis`);
  }

  private sendDiagnosticsForDocuments(results: ModelsAnalyzeResult[]): void {
    for (const result of results) {
      const model = this.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === result.modelUniqueId)?.getValue();
      if (model) {
        const uri = URI.file(this.dbtRepository.getNodeFullPath(model)).toString();
        let diagnostics: Diagnostic[] = [];
        if (result.analyzeResult.ast.isErr()) {
          const { rawCode } = model;
          const compiledCode = this.dbtRepository.getModelCompiledCode(model);
          if (rawCode && compiledCode) {
            diagnostics = this.diagnosticGenerator.getSqlErrorDiagnostics(result.analyzeResult.ast.error, rawCode, compiledCode).raw;
          }
        }
        this.notificationSender.sendRawDiagnostics({ uri, diagnostics });
      }
    }
  }
}
