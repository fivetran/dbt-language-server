import { Diagnostic, FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { DbtRepository } from './DbtRepository';
import { DestinationContext } from './DestinationContext';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { FileChangeListener } from './FileChangeListener';
import { DagNodeFetcher } from './ModelFetcher';
import { NotificationSender } from './NotificationSender';
import { AnalyzeResult, ModelsAnalyzeResult } from './ProjectAnalyzer';
import { ProjectProgressReporter } from './ProjectProgressReporter';
import { Dbt } from './dbt_execution/Dbt';
import { DbtTextDocument } from './document/DbtTextDocument';
import { debounce } from './utils/Utils';

export class ProjectChangeListener {
  private static PROJECT_COMPILE_DEBOUNCE_TIMEOUT = 1000;

  private analysisInProgress = false;

  constructor(
    private openedDocuments: Map<string, DbtTextDocument>,
    private destinationContext: DestinationContext,
    private dbtRepository: DbtRepository,
    private diagnosticGenerator: DiagnosticGenerator,
    private notificationSender: NotificationSender,
    private dbt: Dbt,
    private enableEntireProjectAnalysis: boolean,
    private fileChangeListener: FileChangeListener,
    private projectProgressReporter: ProjectProgressReporter,
  ) {
    fileChangeListener.onSqlModelChanged(c => this.onSqlModelChanged(c));
  }

  setEnableEntireProjectAnalysis(value: boolean): void {
    this.enableEntireProjectAnalysis = value;
  }

  async compileAndAnalyzeProject(): Promise<void> {
    if (this.analysisInProgress) {
      console.log('Analysis is already in progress. Skip recompiling/reanalyzing the project');
      return;
    }
    console.log('Starting to recompile/reanalyze the project');
    this.projectProgressReporter.sendAnalyzeBegin();
    this.projectProgressReporter.sendAnalyzeProgressMessage('dbt compile', 0);
    this.analysisInProgress = true;
    try {
      this.dbt.refresh();
      await this.dbt.compileProject(this.dbtRepository);
      this.fileChangeListener.updateManifestNodes();
      await this.analyzeProject().catch(e => console.log(`Error while analyzing project: ${e instanceof Error ? e.message : String(e)}`));
    } finally {
      this.projectProgressReporter.sendAnalyzeEnd();
      this.analysisInProgress = false;
    }
  }

  forceCompileAndAnalyzeProject(): void {
    this.debouncedCompileAndAnalyze();
  }

  /** Analyses model tree, sends diagnostics for the entire tree and returns diagnostics for root model */
  async analyzeModelTree(rawDocUri: string, sql: string): Promise<AnalyzeResult | undefined> {
    const { fsPath } = URI.parse(rawDocUri);
    const modelFetcher = new DagNodeFetcher(this.dbtRepository, fsPath);
    const node = await modelFetcher.getDagNode();
    let mainModelResult: AnalyzeResult | undefined;

    if (node) {
      const results = await this.destinationContext.analyzeModelTree(node, sql);
      this.sendDiagnosticsForDocuments(results);
      mainModelResult = results.find(r => r.modelUniqueId === node.getValue().uniqueId)?.analyzeResult;
    } else {
      const result = await this.destinationContext.analyzeSql(sql);
      mainModelResult = result;
    }
    return mainModelResult;
  }

  private onSqlModelChanged(changes: FileEvent[]): void {
    const externalChangeHappened = changes.some(c => !this.openedDocuments.has(c.uri) && c.type !== FileChangeType.Deleted);
    if (externalChangeHappened) {
      this.debouncedCompileAndAnalyze();
    }
  }

  private debouncedCompileAndAnalyze = debounce(async () => {
    await this.compileAndAnalyzeProject();
  }, ProjectChangeListener.PROJECT_COMPILE_DEBOUNCE_TIMEOUT);

  private async analyzeProject(): Promise<void> {
    if (!this.enableEntireProjectAnalysis || this.destinationContext.isEmpty()) {
      return;
    }
    const results = await this.destinationContext.analyzeProject((completedCount: number, modelsCount: number) => {
      this.projectProgressReporter.sendAnalyzeProgress(completedCount, modelsCount);
    });
    this.notificationSender.clearAllDiagnostics();
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
