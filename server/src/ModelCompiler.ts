import { DbtCompileJob } from './DbtCompileJob';
import { CompileResult, DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';

export class ModelCompiler {
  readonly RETRY_COUNT = 15;

  dbtTextDocument: DbtTextDocument;
  dbtServer: DbtServer;
  dbtCompileTaskQueue: DbtCompileJob[] = [];
  compilationInProgress = false;
  pollIsRunning = false;

  constructor(dbtTextDocument: DbtTextDocument, dbtServer: DbtServer) {
    this.dbtTextDocument = dbtTextDocument;
    this.dbtServer = dbtServer;
  }

  async isDbtServerStarted() {
    for (let i = 1; i <= this.RETRY_COUNT; i++) {
      const started = this.dbtServer.isStarted();
      if (started) {
        return true;
      }
      await this.wait(300);
    }
  }

  async compile(): Promise<void> {
    this.compilationInProgress = true;
    const isStarted = await this.isDbtServerStarted();
    if (!isStarted) {
      return;
    }

    const status = await this.dbtServer.getCurrentStatus();
    if (status?.error?.data?.message) {
      await this.dbtTextDocument.onCompilationFinished(undefined, status?.error?.data?.message);
      return;
    }

    if (this.dbtCompileTaskQueue.length > 3) {
      const taskToKill = this.dbtCompileTaskQueue.shift();
      taskToKill?.kill();
    }
    this.startNewTask();

    await this.pollResults();
  }

  startNewTask() {
    const task = new DbtCompileJob(this.dbtServer, this.dbtTextDocument.rawDocument.getText());
    this.dbtCompileTaskQueue.push(task);
    task.runCompile();
  }

  async pollResults() {
    if (this.pollIsRunning) {
      return;
    }
    this.pollIsRunning = true;

    while (this.dbtCompileTaskQueue.length > 0) {
      const length = this.dbtCompileTaskQueue.length;
      console.log(length);

      for (let i = length - 1; i >= 0; i--) {
        const task = this.dbtCompileTaskQueue[i];
        const response = await task.getResult();

        if (!response) {
          continue;
        }
        if (response?.error || response?.result.state !== 'running') {
          const tasksToKill = this.dbtCompileTaskQueue.splice(0, i + 1);
          for (let j = 0; j < i; j++) {
            tasksToKill[j].kill();
          }
          console.log(`${i + 1} elements were removed`);

          if (response?.error) {
            await this.dbtTextDocument.onCompilationFinished(undefined, response?.error.data?.message);
            break;
          }

          const compiledNodes = <CompileResult[]>response?.result.results;

          if (compiledNodes.length > 0) {
            const compiledSql = compiledNodes[0].node.compiled_sql;
            await this.dbtTextDocument.onCompilationFinished(compiledSql);
          }
          break;
        }
      }

      if (this.dbtCompileTaskQueue.length === 0) {
        break;
      }
      console.log('Wait for 500 ms');
      await this.wait(500);
    }
    this.pollIsRunning = false;
    this.compilationInProgress = false;
  }

  wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms, []));
  }
}
