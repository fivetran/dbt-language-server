import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Result } from 'neverthrow';
import { Diagnostic, FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { BigQueryContext } from './bigquery/BigQueryContext';
import { DbtRepository } from './DbtRepository';
import { Dbt } from './dbt_execution/Dbt';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FileChangeListener } from './FileChangeListener';
import { DagNodeFetcher } from './ModelFetcher';
import { NotificationSender } from './NotificationSender';
import { ModelsAnalyzeResult } from './ProjectAnalyzer';
import { debounce } from './utils/Utils';

export class ProjectChangeListener {
  private static PROJECT_COMPILE_DEBOUNCE_TIMEOUT = 1000;

  constructor(
    private openedDocuments: Map<string, DbtTextDocument>,
    private bigQueryContext: BigQueryContext,
    private dbtRepository: DbtRepository,
    private diagnosticGenerator: DiagnosticGenerator,
    private notificationSender: NotificationSender,
    private dbt: Dbt,
    private enableEntireProjectAnalysis: boolean,
    fileChangeListener: FileChangeListener,
  ) {
    fileChangeListener.onSqlModelChanged(c => this.onSqlModelChanged(c));
  }

  setEnableEntireProjectAnalysis(value: boolean): void {
    this.enableEntireProjectAnalysis = value;
  }

  async compileAndAnalyzeProject(): Promise<void> {
    this.dbt.refresh();
    await this.dbt.compileProject(this.dbtRepository);
    this.analyzeProject().catch(e => console.log(`Error while analyzing project: ${e instanceof Error ? e.message : String(e)}`));
  }

  /** Analyses model tree, sends diagnostics for the entire tree and returns diagnostics for root model */
  async analyzeModelTree(rawDocUri: string, sql: string): Promise<Result<AnalyzeResponse__Output, string> | undefined> {
    const { fsPath } = URI.parse(rawDocUri);
    const modelFetcher = new DagNodeFetcher(this.dbtRepository, fsPath);
    const node = await modelFetcher.getDagNode();
    let mainModelResult: Result<AnalyzeResponse__Output, string> | undefined;

    if (node) {
      const results = await this.bigQueryContext.analyzeModelTree(node, sql);
      this.sendDiagnosticsForDocuments(results);
      mainModelResult = results.find(r => r.modelUniqueId === node.getValue().uniqueId)?.analyzeResult.astResult;
    } else {
      const result = await this.bigQueryContext.analyzeSql(sql);
      mainModelResult = result.astResult;
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
    console.log('External change has happened. Start recompiling/reanalyzing the project');
    await this.compileAndAnalyzeProject();
  }, ProjectChangeListener.PROJECT_COMPILE_DEBOUNCE_TIMEOUT);

  private async analyzeProject(): Promise<void> {
    if (!this.enableEntireProjectAnalysis || this.bigQueryContext.isEmpty()) {
      return;
    }
    const results = await this.bigQueryContext.analyzeProject();
    this.notificationSender.clearAllDiagnostics();
    this.sendDiagnosticsForDocuments(results);
    console.log(`Processed ${results.length} models. ${results.filter(r => r.analyzeResult.astResult.isErr()).length} errors found during analysis`);
  }

  private sendDiagnosticsForDocuments(results: ModelsAnalyzeResult[]): void {
    for (const result of results) {
      const model = this.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === result.modelUniqueId)?.getValue();
      if (model) {
        const uri = URI.file(this.dbtRepository.getModelRawSqlPath(model)).toString();
        let diagnostics: Diagnostic[] = [];
        if (result.analyzeResult.astResult.isErr()) {
          const { rawCode } = model;
          const compiledCode = this.dbtRepository.getModelCompiledCode(model);
          if (rawCode && compiledCode) {
            diagnostics = this.diagnosticGenerator.getSqlErrorDiagnostics(result.analyzeResult.astResult.error, rawCode, compiledCode).raw;
          }
        }
        this.notificationSender.sendRawDiagnostics({ uri, diagnostics });
      }
    }
  }
}
