import { ChildProcess, ExecException } from 'child_process';
import * as fs from 'fs';
import { err, ok, Result } from 'neverthrow';
import { DbtCli } from './DbtCli';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtRepository } from './DbtRepository';
import { ManifestModel } from './manifest/ManifestJson';
import retry = require('async-retry');
import path = require('path');

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
      let compiledPath;
      if (!this.modelPath.endsWith('.sql')) {
        const pathParts = this.modelPath.split('.');
        pathParts.splice(1, 0, 'models');
        pathParts[pathParts.length - 1] += '.sql';
        compiledPath = path.resolve(this.dbtRepository.dbtTargetPath, 'compiled', ...pathParts);
      } else {
        const model = await this.findModelWithRetries();
        compiledPath = this.dbtRepository.getModelCompiledPath(model);
      }

      const sql = this.getCompiledSql(compiledPath);
      this.result = sql ? ok(sql) : err('Compiled file not found');
    } catch (e) {
      this.result = err('Model not found in manifest.json');
    }
  }

  async findModelWithRetries(): Promise<ManifestModel> {
    return retry(
      () => {
        const model = this.dbtRepository.models.find(m => m.originalFilePath === this.modelPath);
        if (model === undefined) {
          console.log('Model not found in manifest.json, retrying...');
          throw new Error('Model not found in manifest.json');
        }

        return model;
      },
      { factor: 1, retries: 3, minTimeout: 100 },
    );
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
