import { DbtCompileJob } from './jobs/DbtCompileJob';
import { DbtCompileModelJob } from './jobs/DbtCompileModelJob';
import { DbtCompileSqlJob } from './jobs/DbtCompileSqlJob';
import { CompileResult, DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';
import { WorkspaceFolder } from 'vscode-languageserver';

export class ModelCompiler {
  dbtTextDocument: DbtTextDocument;
  dbtServer: DbtServer;
  dbtCompileTaskQueue: DbtCompileJob[] = [];
  compilationInProgress = false;
  pollIsRunning = false;
  workspaceFolders: WorkspaceFolder[];

  constructor(dbtTextDocument: DbtTextDocument, dbtServer: DbtServer, workspaceFolders: WorkspaceFolder[]) {
    this.dbtTextDocument = dbtTextDocument;
    this.dbtServer = dbtServer;
    this.workspaceFolders = workspaceFolders;
  }

  async compile(): Promise<void> {
    this.compilationInProgress = true;
    const status = await this.dbtServer.getCurrentStatus();
    if (status?.error?.data?.message) {
      await this.dbtTextDocument.onCompilationError(status.error.data.message);
      return;
    }

    if (this.dbtCompileTaskQueue.length > 3) {
      const taskToKill = this.dbtCompileTaskQueue.shift();
      void taskToKill?.kill();
    }
    this.startNewTask();

    await this.pollResults();
  }

  startNewTask(): void {
    const documentUri = this.dbtTextDocument.rawDocument.uri;
    const documentWorkspaces = this.workspaceFolders.filter(w => documentUri.indexOf(w.uri) != -1);

    let modelPath = undefined;
    if (documentWorkspaces.length > 0) {
      const workingDirectory = documentWorkspaces[0].uri;
      const index = documentUri.indexOf(workingDirectory);
      modelPath = documentUri.slice(index + workingDirectory.length + 1);
    }

    let task;
    if (modelPath) {
      task = new DbtCompileModelJob(this.dbtServer, modelPath);
    } else {
      task = new DbtCompileSqlJob(this.dbtServer, this.dbtTextDocument.rawDocument.getText());
    }

    this.dbtCompileTaskQueue.push(task);
    void task.runCompile();
  }

  async pollResults(): Promise<void> {
    if (this.pollIsRunning) {
      return;
    }
    this.pollIsRunning = true;

    while (this.dbtCompileTaskQueue.length > 0) {
      const length = this.dbtCompileTaskQueue.length;

      for (let i = length - 1; i >= 0; i--) {
        const task = this.dbtCompileTaskQueue[i];
        const response = await task.getResult();

        if (!response) {
          continue;
        }
        if (response?.error || response?.result.state !== 'running') {
          const tasksToKill = this.dbtCompileTaskQueue.splice(0, i + 1);
          for (let j = 0; j < i; j++) {
            void tasksToKill[j].kill();
          }

          if (response?.error) {
            await this.dbtTextDocument.onCompilationError(response?.error.data?.message ?? 'dbt compile error');
            break;
          }

          const compiledNodes = <CompileResult[]>response?.result.results;

          if (compiledNodes.length > 0) {
            const compiledSql = compiledNodes[0].node.compiled_sql;
            await this.dbtTextDocument.onCompilationFinished(compiledSql);
          } else {
            await this.dbtTextDocument.onCompilationFinished(' ');
          }
          break;
        }
      }

      if (this.dbtCompileTaskQueue.length === 0) {
        break;
      }
      await this.wait(500);
    }
    this.pollIsRunning = false;
    this.compilationInProgress = false;
    this.dbtTextDocument.onFinishAllCompilationTasks();
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
