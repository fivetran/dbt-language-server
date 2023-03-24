import { WorkDoneProgress, _Connection } from 'vscode-languageserver';

export class ProjectProgressReporter {
  static MODEL_PROGRESS = 'Model_Progress';
  static PROJECT_PROGRESS = 'Project_Progress';

  constructor(private connection: _Connection) {}

  sendAnalyzeBegin(): void {
    this.connection
      .sendProgress(WorkDoneProgress.type, ProjectProgressReporter.PROJECT_PROGRESS, {
        kind: 'begin',
        title: 'Analyzing project',
      })
      .catch(e => console.log(`Failed to send progress: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendAnalyzeProgress(analyzedModelsCount: number, modelsCount: number): void {
    this.sendAnalyzeProgressMessage(`${analyzedModelsCount}/${modelsCount} models`, (analyzedModelsCount * 100) / modelsCount);
  }

  sendAnalyzeProgressMessage(message: string, percentage: number): void {
    this.connection
      .sendProgress(WorkDoneProgress.type, ProjectProgressReporter.PROJECT_PROGRESS, {
        kind: 'report',
        message,
        percentage,
      })
      .catch(e => console.log(`Failed to send progress: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendAnalyzeEnd(): void {
    this.connection
      .sendProgress(WorkDoneProgress.type, ProjectProgressReporter.PROJECT_PROGRESS, {
        kind: 'end',
      })
      .catch(e => console.log(`Failed to send progress: ${e instanceof Error ? e.message : String(e)}`));
  }
}
