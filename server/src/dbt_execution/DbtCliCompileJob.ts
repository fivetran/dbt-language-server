import { err, ok, Result } from 'neverthrow';
import { ChildProcess, ExecException } from 'node:child_process';
import * as fs from 'node:fs';
import { DbtRepository } from '../DbtRepository';
import { runWithTimeout } from '../utils/Utils';
import { DbtCli } from './DbtCli';
import { DbtCompileJob } from './DbtCompileJob';

export class DbtCliCompileJob extends DbtCompileJob {
  static COMPILE_MODEL_TIMEOUT_MS = 20000;
  static COMPILE_MODEL_TIMEOUT_EXCEEDED = 'dbt compile timeout exceeded';

  private process?: ChildProcess;
  result?: Result<string, string>;

  constructor(modelPath: string, dbtRepository: DbtRepository, private dbtCli: DbtCli) {
    super(modelPath, dbtRepository);
  }

  async start(): Promise<void> {
    const promise = this.dbtCli.compile(this.modelPath);
    this.process = promise.child;

    try {
      await runWithTimeout(promise, DbtCliCompileJob.COMPILE_MODEL_TIMEOUT_MS, DbtCliCompileJob.COMPILE_MODEL_TIMEOUT_EXCEEDED);
    } catch (e: unknown) {
      if (e instanceof Object && 'stdout' in e) {
        const error = e as ExecException & { stdout?: string; stderr?: string };
        this.result = err(error.stdout ? this.extractDbtError(error.stdout) : error.message);
      } else {
        this.result = err(e instanceof Error ? e.message : String(e));
      }
      return;
    }

    await this.findResultFromFile();
  }

  private async findResultFromFile(): Promise<void> {
    try {
      const compiledPath = await this.findCompiledFilePath();
      const sql = this.getCompiledSql(compiledPath);

      this.result = sql ? ok(sql) : err('Compiled file not found');
    } catch (e) {
      this.result = err(e instanceof Error ? e.message : String(e));
    }
  }

  forceStop(): Promise<void> {
    this.process?.kill('SIGKILL');
    return Promise.resolve();
  }

  getResult(): Result<string, string> | undefined {
    return this.process?.exitCode === null ? undefined : this.result;
  }

  protected getCompiledSql(filePath: string): string | undefined {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      console.log(`Cannot get compiled sql for ${filePath}`);
      return undefined;
    }
  }
}
