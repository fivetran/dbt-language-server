import { Emitter, Event } from 'vscode-languageserver';
import { DbtRepository } from './DbtRepository';
import { Dbt } from './dbt_execution/Dbt';
import { DbtCompileJob } from './dbt_execution/DbtCompileJob';
import { DbtRpcCompileJob } from './dbt_execution/DbtRpcCompileJob';
import { wait } from './utils/Utils';

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

  constructor(private dbt: Dbt, private dbtRepository: DbtRepository) {}

  async compile(modelPath: string): Promise<void> {
    this.compilationInProgress = true;
    const status = await this.dbt.getStatus();
    if (status) {
      console.log('Status error occurred when compiling model.');
      this.onCompilationErrorEmitter.fire(status);
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
    const job = this.dbt.createCompileJob(modelPath, this.dbtRepository);
    this.dbtCompileJobQueue.push(job);
    job.start().catch(e => console.log(`Failed to start job: ${e instanceof Error ? e.message : String(e)}`));
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
            if (result.error === DbtRpcCompileJob.JOB_IS_NOT_COMPLETED) {
              // Don't fire any event and leave an preview result
            } else {
              this.onCompilationErrorEmitter.fire(result.error);
            }
          } else {
            this.onCompilationFinishedEmitter.fire(result.value);
          }
          break;
        }
      }

      if (this.dbtCompileJobQueue.length === 0) {
        break;
      }
      await wait(500);
    }
    this.pollIsRunning = false;
    this.compilationInProgress = false;
    this.onFinishAllCompilationJobsEmitter.fire();
  }
}
