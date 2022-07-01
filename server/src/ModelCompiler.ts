import * as fs from 'fs';
import { Emitter, Event } from 'vscode-languageserver';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRepository } from './DbtRepository';
import { DbtRpcClient } from './DbtRpcClient';
import { DbtRpcCompileJob } from './DbtRpcCompileJob';

import path = require('path');

export enum Mode {
  DBT_RPC,
  CLI,
}

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

  constructor(private dbtRpcClient: DbtRpcClient, private dbtRepository: DbtRepository, private mode: Mode) {}

  async compile(modelPath: string): Promise<void> {
    this.compilationInProgress = true;
    const status = await this.dbtRpcClient.getStatus();
    if (status?.error?.data?.message) {
      console.log('dbt rpc status error');
      this.onCompilationErrorEmitter.fire(status.error.data.message);
      return;
    }

    if (this.dbtCompileJobQueue.length > 3) {
      const jobToStop = this.dbtCompileJobQueue.shift();
      jobToStop?.forceStop().catch(e => console.log(`Failed to stop job: ${e instanceof Error ? e.message : String(e)}`));
    }
    this.startNewJob(modelPath);

    await this.pollResults(modelPath);
  }

  startNewJob(modelPath: string): void {
    const job = this.createCompileJob(modelPath);
    this.dbtCompileJobQueue.push(job);
    job.start().catch(e => console.log(`Failed to start job: ${e instanceof Error ? e.message : String(e)}`));
  }

  createCompileJob(modelPath: string): DbtCompileJob {
    return this.mode === Mode.DBT_RPC ? new DbtRpcCompileJob(this.dbtRpcClient, modelPath) : new DbtRpcCompileJob(this.dbtRpcClient, '');
  }

  async pollResults(modelPath: string): Promise<void> {
    if (this.pollIsRunning) {
      return;
    }
    this.pollIsRunning = true;

    while (this.dbtCompileJobQueue.length > 0) {
      const { length } = this.dbtCompileJobQueue;

      for (let i = length - 1; i >= 0; i--) {
        const result = this.dbtCompileJobQueue[i].getResult();

        if (result) {
          const jobsToStop = this.dbtCompileJobQueue.splice(0, i + 1);
          for (let j = 0; j < i; j++) {
            jobsToStop[j].forceStop().catch(e => console.log(`Failed to stop job: ${e instanceof Error ? e.message : String(e)}`));
          }

          if (result.isErr()) {
            this.onCompilationErrorEmitter.fire(result.error);
          } else {
            // For some reason rpc server don't return compilation result for models with materialized='ephemeral'
            const value = result.value === ' ' ? this.fallbackForEphemeralModel(modelPath) : result.value;
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

  fallbackForEphemeralModel(modelPath: string): string {
    console.log(`Use fallback for ephemeral model ${modelPath}`);
    try {
      let pathParts;
      let resultPath;
      if (this.dbtRepository.modelPaths.some(m => modelPath.startsWith(m))) {
        pathParts = modelPath.split(path.sep);
        if (this.dbtRepository.projectName) {
          pathParts.splice(0, 0, this.dbtRepository.projectName);
        }
        resultPath = path.resolve(this.dbtRepository.dbtTargetPath, 'compiled', ...pathParts);
      } else {
        pathParts = modelPath.split('.');
        pathParts.splice(1, 0, 'models');
        pathParts[pathParts.length - 1] += '.sql';
        resultPath = path.resolve('target', 'compiled', ...pathParts);
      }
      return fs.readFileSync(`${resultPath}`, 'utf8');
    } catch (e) {
      return ' ';
    }
  }
}
