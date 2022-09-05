import { Result } from 'neverthrow';
import { EOL } from 'node:os';
import * as path from 'node:path';
import { DbtRepository } from '../DbtRepository';
import { ModelFetcher } from '../ModelFetcher';

export abstract class DbtCompileJob {
  static readonly NO_RESULT_FROM_COMPILER = ' ';

  constructor(
    protected modelPath: string,
    protected dbtRepository: DbtRepository,
    // For empty models we don't use fallback
    protected allowFallback: boolean,
  ) {}

  abstract start(): Promise<void>;

  abstract forceStop(): Promise<void>;

  /** @returns Ok with compiled sql or Err with dbt error or undefined if compilation is not finished yet */
  abstract getResult(): Result<string, string> | undefined;

  extractDbtError(message: string): string {
    const index = message.indexOf('Compilation Error');

    if (index > -1) {
      const error = message.slice(index);
      const errorLines = error.split(EOL);
      return (errorLines.length > 3 ? errorLines.slice(0, 4).join(EOL) : message).trim();
    }
    return message.trim();
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
