import * as fs from 'fs';
import { Emitter, Event } from 'vscode-languageserver';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRpcClient } from './DbtRpcClient';

import path = require('path');

export class ModelCompiler {
  private dbtCompileJobQueue: DbtCompileJob[] = [];
  private pollIsRunning = false;

  private onCompilationErrorEmitter = new Emitter<string>();
  private onCompilationFinishedEmitter = new Emitter<string>();
  private onFinishAllCompilationJobsEmitter = new Emitter<void>();

  compilationInProgress = false;

  get onCompilationError(): Event<string> {
    return this.onCompilationErrorEmitter.event;
  }

  get onCompilationFinished(): Event<string> {
    return this.onCompilationFinishedEmitter.event;
  }

  get onFinishAllCompilationJobs(): Event<void> {
    return this.onFinishAllCompilationJobsEmitter.event;
  }

  constructor(private dbtRpcClient: DbtRpcClient) {}

  async compile(modelPath: string): Promise<void> {
    this.compilationInProgress = true;
    const status = await this.dbtRpcClient.getStatus();
    if (status?.error?.data?.message) {
      this.onCompilationErrorEmitter.fire(status.error.data.message);
      return;
    }

    if (this.dbtCompileJobQueue.length > 3) {
      const jobToStop = this.dbtCompileJobQueue.shift();
      void jobToStop?.stop();
    }
    this.startNewJob(modelPath);

    await this.pollResults(modelPath);
  }

  startNewJob(modelPath: string): void {
    const job = new DbtCompileJob(this.dbtRpcClient, modelPath);
    this.dbtCompileJobQueue.push(job);
    void job.start();
  }

  async pollResults(modelPath: string): Promise<void> {
    if (this.pollIsRunning) {
      return;
    }
    this.pollIsRunning = true;

    while (this.dbtCompileJobQueue.length > 0) {
      const { length } = this.dbtCompileJobQueue;

      for (let i = length - 1; i >= 0; i--) {
        const job = this.dbtCompileJobQueue[i];
        const { result } = job;

        if (result) {
          const jobsToStop = this.dbtCompileJobQueue.splice(0, i + 1);
          for (let j = 0; j < i; j++) {
            void jobsToStop[j].stop();
          }

          if (result.isErr()) {
            this.onCompilationErrorEmitter.fire(result.error);
          } else {
            const value =
              // For some reason rpc server don't compile intermediate models for packages, for this case we get results from target folder
              result.value === ' ' && modelPath.includes('intermediate') && !modelPath.includes(path.sep)
                ? this.fallbackForIntermediateModel(modelPath)
                : result.value;

            this.onCompilationFinishedEmitter.fire(value);
          }
          break;
        }
      }

      if (this.dbtCompileJobQueue.length === 0) {
        break;
      }
      await this.wait(500);
    }
    this.pollIsRunning = false;
    this.compilationInProgress = false;
    this.onFinishAllCompilationJobsEmitter.fire();
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }

  fallbackForIntermediateModel(modelPath: string): string {
    try {
      const pathParts = modelPath.split('.');
      pathParts.splice(1, 0, 'models');
      const resultPath = path.resolve('target', 'compiled', ...pathParts);
      return fs.readFileSync(`${resultPath}.sql`, 'utf8');
    } catch (e) {
      return ' ';
    }
  }
}
