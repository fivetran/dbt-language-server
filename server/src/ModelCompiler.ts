import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtCompileJob } from './DbtCompileJob';
import { CompileResult, DbtServer } from './DbtServer';
import { DbtTextDocument } from './DbtTextDocument';

export class ModelCompiler {
  dbtTextDocument: DbtTextDocument;
  dbtServer: DbtServer;
  dbtCompileTaskQueue: DbtCompileJob[] = [];
  pollIsRunning = false;

  constructor(dbtTextDocument: DbtTextDocument, dbtServer: DbtServer) {
    this.dbtTextDocument = dbtTextDocument;
    this.dbtServer = dbtServer;
  }

  async compile() {
    const status = await this.dbtServer.getReadyOrErrorStatus();
    if (status?.error) {
      await this.dbtTextDocument.onCompilationFinished(status?.error.message);
      return;
    }

    if (this.dbtCompileTaskQueue.length > 3) {
      const taskToKill = this.dbtCompileTaskQueue.shift();
      taskToKill?.kill();
    }
    const task = new DbtCompileJob(this.dbtServer, this.dbtTextDocument.rawDocument.getText());
    this.dbtCompileTaskQueue.push(task);
    task.runCompile();
    await this.pollResults();
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
          this.dbtCompileTaskQueue.splice(0, i + 1);
          console.log(`${i + 1} elements were removed`);

          if (response?.error) {
            await this.dbtTextDocument.onCompilationFinished(response?.error.data?.message);
            break;
          }

          const compiledNodes = <CompileResult[]>response?.result.results;

          if (compiledNodes.length > 0) {
            const compiledSql = compiledNodes[0].node.compiled_sql;
            TextDocument.update(this.dbtTextDocument.compiledDocument, [{ text: compiledSql }], this.dbtTextDocument.compiledDocument.version);
            await this.dbtTextDocument.onCompilationFinished();
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
  }

  wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms, []));
  }
}
