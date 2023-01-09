import { FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { BigQueryContext } from './bigquery/BigQueryContext';
import { DbtRepository } from './DbtRepository';
import { Dbt } from './dbt_execution/Dbt';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { DbtTextDocument } from './document/DbtTextDocument';
import { FileChangeListener } from './FileChangeListener';
import { NotificationSender } from './NotificationSender';

export class ProjectChangeListener {
  constructor(
    private openedDocuments: Map<string, DbtTextDocument>,
    private bigQueryContext: BigQueryContext,
    private dbtRepository: DbtRepository,
    private diagnosticGenerator: DiagnosticGenerator,
    private notificationSender: NotificationSender,
    private dbt: Dbt,
    fileChangeListener: FileChangeListener,
  ) {
    fileChangeListener.onSqlModelChanged(c => this.onSqlModelChanged(c));
  }

  onSqlModelChanged(changes: FileEvent[]): void {
    if (changes.some(c => !this.openedDocuments.has(c.uri) && c.type !== FileChangeType.Deleted)) {
      // TODO: re-compile/re-analyze the project
    }
  }

  async compileAndAnalyzeProject(): Promise<void> {
    await this.dbt.compileProject(this.dbtRepository);
    this.analyzeProject().catch(e => console.log(`Error while analyzing project: ${e instanceof Error ? e.message : String(e)}`));
  }

  async analyzeProject(): Promise<void> {
    if (this.bigQueryContext.isEmpty()) {
      return;
    }
    const analyzeResults = await this.bigQueryContext.analyzeProject();
    let modelsCount = 0;
    let errorCount = 0;
    for (const [uniqueId, result] of analyzeResults.entries()) {
      modelsCount++;
      if (result.isErr()) {
        const model = this.dbtRepository.models.find(m => m.uniqueId === uniqueId);
        if (model) {
          const { rawCode } = model;
          const compiledCode = this.dbtRepository.getModelCompiledCode(model);
          if (rawCode && compiledCode) {
            const uri = URI.file(this.dbtRepository.getModelRawSqlPath(model)).toString();
            const diagnostics = this.diagnosticGenerator.getSqlErrorDiagnostics(result.error, rawCode, compiledCode).raw;
            this.notificationSender.sendRawDiagnostics({ uri, diagnostics });
            errorCount++;
          }
        }
      }
    }
    console.log(`Processed ${modelsCount} models. ${errorCount} errors found during analysis`);
  }
}
