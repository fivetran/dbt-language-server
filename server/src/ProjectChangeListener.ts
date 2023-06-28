import { Diagnostic, FileChangeType, FileEvent } from 'vscode-languageserver';
import { URI } from 'vscode-uri';
import { DbtRepository } from './DbtRepository';
import { DestinationContext } from './DestinationContext';
import { DiagnosticGenerator } from './DiagnosticGenerator';
import { FileChangeListener } from './FileChangeListener';
import { MacroCompilationServer } from './MacroCompilationServer';
import { DagNodeFetcher } from './ModelFetcher';
import { NotificationSender } from './NotificationSender';
import { AnalyzeResult, ModelsAnalyzeResult } from './ProjectAnalyzer';
import { ProjectProgressReporter } from './ProjectProgressReporter';
import { DbtCli } from './dbt_execution/DbtCli';
import { DbtTextDocument } from './document/DbtTextDocument';
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
    private openedDocuments: Map<string, DbtTextDocument>,
    private destinationContext: DestinationContext,
    private dbtRepository: DbtRepository,
    private diagnosticGenerator: DiagnosticGenerator,
    private notificationSender: NotificationSender,
    private dbtCli: DbtCli,
    private enableEntireProjectAnalysis: boolean,
    private fileChangeListener: FileChangeListener,
    private projectProgressReporter: ProjectProgressReporter,
    private macroCompilationServer: MacroCompilationServer,
  ) {
    fileChangeListener.onSqlModelChanged(c => this.onSqlModelChanged(c));
  }

  setEnableEntireProjectAnalysis(value: boolean): void {
    this.enableEntireProjectAnalysis = value;
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
    if (this.enableEntireProjectAnalysis && !this.destinationContext.isEmpty()) {
      this.notificationSender.clearAllDiagnostics();
    }

    // We should reset catalog before compiling the project, because the catalog will start to re-fill during compilation
    this.destinationContext.resetCache();
    const compileResult = await this.dbtCli.compileProject(this.dbtRepository);
    if (compileResult.isOk()) {
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
    } else if (this.currentDbtError) {
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
  async analyzeModelTree(rawDocUri: string, sql: string): Promise<AnalyzeResult | undefined> {
    const { fsPath } = URI.parse(rawDocUri);
    const modelFetcher = new DagNodeFetcher(this.dbtRepository, fsPath);
    const node = await modelFetcher.getDagNode();
    let mainModelResult: AnalyzeResult | undefined;

    if (node) {
      const results = await this.destinationContext.analyzeModelTree(node, sql, new AbortController().signal);
      this.sendDiagnosticsForDocuments(results.filter(r => r.modelUniqueId !== node.getValue().uniqueId));
      mainModelResult = results.find(r => r.modelUniqueId === node.getValue().uniqueId)?.analyzeResult;
    } else {
      const result = await this.destinationContext.analyzeSql(sql, new AbortController().signal);
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
