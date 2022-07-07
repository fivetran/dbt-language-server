import { Result } from 'neverthrow';
import { DbtRepository } from './DbtRepository';
import { ManifestModel } from './manifest/ManifestJson';
import path = require('path');
import retry = require('async-retry');

export abstract class DbtCompileJob {
  constructor(protected modelPath: string, protected dbtRepository: DbtRepository) {}

  abstract start(): Promise<void>;

  abstract forceStop(): Promise<void>;

  /** @returns Ok with compiled sql or Err with dbt error or undefined if compilation is not finished yet */
  abstract getResult(): Result<string, string> | undefined;

  extractDbtError(message: string): string {
    const index = message.indexOf('Compilation Error');
    return (index !== -1 ? message.substring(index) : message).trim();
  }

  async findCompiledFilePath(): Promise<string> {
    if (this.modelPath.endsWith('.sql')) {
      const model = await this.findModelWithRetries();
      return this.dbtRepository.getModelCompiledPath(model);
    }
    return this.findCompiledFileInPackage();
  }

  findCompiledFileInPackage(): string {
    const pathParts = this.modelPath.split('.');
    pathParts.splice(1, 0, 'models');
    pathParts[pathParts.length - 1] += '.sql';
    return path.resolve(this.dbtRepository.dbtTargetPath, 'compiled', ...pathParts);
  }

  /** We retry here because in some situations manifest.json can appear a bit later after compilation is finished */
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
}
