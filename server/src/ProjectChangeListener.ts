import { Diagnostic, FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { BigQueryContext } from './bigquery/BigQueryContext';
import { DbtRepository } from './DbtRepository';
import { Dbt } from './dbt_execution/Dbt';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FileChangeListener } from './FileChangeListener';
import { NotificationSender } from './NotificationSender';
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
    await this.dbt.compileProject(this.dbtRepository);
    this.analyzeProject().catch(e => console.log(`Error while analyzing project: ${e instanceof Error ? e.message : String(e)}`));
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
    const analyzeResults = await this.bigQueryContext.analyzeProject();
    let modelsCount = 0;
    let errorCount = 0;
    for (const [uniqueId, result] of analyzeResults.entries()) {
      modelsCount++;
      const model = this.dbtRepository.models.find(m => m.uniqueId === uniqueId);
      if (model) {
        const uri = URI.file(this.dbtRepository.getModelRawSqlPath(model)).toString();
        let diagnostics: Diagnostic[] = [];
        if (result.isErr()) {
          const { rawCode } = model;
          const compiledCode = this.dbtRepository.getModelCompiledCode(model);
          if (rawCode && compiledCode) {
            diagnostics = this.diagnosticGenerator.getSqlErrorDiagnostics(result.error, rawCode, compiledCode).raw;
            errorCount++;
          }
        }
        this.notificationSender.sendRawDiagnostics({ uri, diagnostics });
      }
    }
    console.log(`Processed ${modelsCount} models. ${errorCount} errors found during analysis`);
  }
}
