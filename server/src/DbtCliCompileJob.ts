import { ChildProcess, ExecException } from 'child_process';
import * as fs from 'fs';
import { err, ok, Result } from 'neverthrow';
import { DbtCli } from './DbtCli';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRepository } from './DbtRepository';

export class DbtCliCompileJob extends DbtCompileJob {
  private dbtCli: DbtCli;
  private process?: ChildProcess;
  result?: Result<string, string>;

  constructor(modelPath: string, dbtRepository: DbtRepository, python?: string) {
    super(modelPath, dbtRepository);
    this.dbtCli = new DbtCli(python);
  }

  async start(): Promise<void> {
    const promise = this.dbtCli.compile(this.modelPath);
    this.process = promise.child;
    try {
      await promise;
    } catch (e: unknown) {
      const error = e as ExecException & { stdout?: string; stderr?: string };
      this.result = err(error.stdout ? this.extractDbtError(error.stdout) : error.message);
      return;
    }

    try {
      const compiledPath = await this.findCompiledFilePath();
      const sql = this.getCompiledSql(compiledPath);

      this.result = sql ? ok(sql) : err('Compiled file not found');
    } catch (e) {
      this.result = err('Model not found in manifest.json');
    }
  }

  forceStop(): Promise<void> {
    this.process?.kill('SIGKILL');
    return Promise.resolve();
  }

  getResult(): Result<string, string> | undefined {
    return this.process?.exitCode === null ? undefined : this.result;
  }

  getCompiledSql(filePath: string): string | undefined {
    try {
      return fs.readFileSync(filePath, 'utf8');
    } catch (e) {
      console.log(`Cannot get compiled sql for ${filePath}`);
      return undefined;
    }
  }
}
