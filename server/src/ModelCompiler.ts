import { Emitter, Event } from 'vscode-languageserver';
import { DbtCompileJob } from './DbtCompileJob';
import { CompileResult, DbtServer } from './DbtServer';

export class ModelCompiler {
  private dbtCompileTaskQueue: DbtCompileJob[] = [];
  private pollIsRunning = false;

  private onCompilationErrorEmitter = new Emitter<string>();
  private onCompilationFinishedEmitter = new Emitter<string>();
  private onFinishAllCompilationTasksEmitter = new Emitter<void>();

  compilationInProgress = false;

  get onCompilationError(): Event<string> {
    return this.onCompilationErrorEmitter.event;
  }

  get onCompilationFinished(): Event<string> {
    return this.onCompilationFinishedEmitter.event;
  }

  get onFinishAllCompilationTasks(): Event<void> {
    return this.onFinishAllCompilationTasksEmitter.event;
  }

  constructor(private dbtServer: DbtServer, private documentUri: string, private workspaceFolder: string) {}

  async compile(): Promise<void> {
    this.compilationInProgress = true;
    const status = await this.dbtServer.getCurrentStatus();
    if (status?.error?.data?.message) {
      this.onCompilationErrorEmitter.fire(status.error.data.message);
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
    const index = this.documentUri.indexOf(this.workspaceFolder);
    if (index === -1) {
      console.log('Opened file is not a part of project workspace. Compile request declined.');
      return;
    }

    const modelPath = this.documentUri.slice(index + this.workspaceFolder.length + 1);

    if (modelPath) {
      const task = new DbtCompileJob(this.dbtServer, modelPath);
      this.dbtCompileTaskQueue.push(task);
      void task.runCompile();
    } else {
      console.log('Unable to determine model path');
    }
  }

  async pollResults(): Promise<void> {
    if (this.pollIsRunning) {
      return;
    }
    this.pollIsRunning = true;

    while (this.dbtCompileTaskQueue.length > 0) {
      const { length } = this.dbtCompileTaskQueue;

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
            this.onCompilationErrorEmitter.fire(response?.error.data?.message ?? 'dbt compile error');
            break;
          }

          const compiledNodes = <CompileResult[]>response?.result.results;

          if (compiledNodes.length > 0) {
            const compiledSql = compiledNodes[0].node.compiled_sql;
            this.onCompilationFinishedEmitter.fire(compiledSql);
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
    this.onFinishAllCompilationTasksEmitter.fire();
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
}
