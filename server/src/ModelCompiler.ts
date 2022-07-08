import { Emitter, Event } from 'vscode-languageserver';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRepository } from './DbtRepository';
import { DbtRpcClient } from './DbtRpcClient';
import { DbtRpcCompileJob } from './DbtRpcCompileJob';

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

  constructor(private dbtRpcClient: DbtRpcClient, private dbtRepository: DbtRepository, private mode: Mode, private python?: string) {}

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

    await this.pollResults();
  }

  startNewJob(modelPath: string): void {
    const job = this.createCompileJob(modelPath);
    this.dbtCompileJobQueue.push(job);
    job.start().catch(e => console.log(`Failed to start job: ${e instanceof Error ? e.message : String(e)}`));
  }

  createCompileJob(modelPath: string): DbtCompileJob {
    return this.mode === Mode.DBT_RPC
      ? new DbtRpcCompileJob(modelPath, this.dbtRepository, this.dbtRpcClient)
      : new DbtCliCompileJob(modelPath, this.dbtRepository, this.python);
  }

  async pollResults(): Promise<void> {
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
            this.onCompilationFinishedEmitter.fire(result.value);
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
}
