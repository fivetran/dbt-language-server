import { Result } from 'neverthrow';
import { DbtRepository } from '../DbtRepository';
import { ModelFetcher } from '../ModelFetcher';
import path = require('path');

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
      const model = await new ModelFetcher(this.dbtRepository, this.modelPath).getModel();
      if (!model) {
        throw new Error(`Cannot find model ${this.modelPath}`);
      }
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
}
