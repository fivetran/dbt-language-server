import { Result } from 'neverthrow';
import { EOL } from 'node:os';
import * as path from 'node:path';
import { DbtRepository } from '../DbtRepository';
import { ModelFetcher } from '../ModelFetcher';

export abstract class DbtCompileJob {
  static readonly NO_RESULT_FROM_COMPILER = ' ';

  abstract start(): Promise<Result<undefined, string>>;

  abstract forceStop(): Promise<void>;

  /** @returns Ok with compiled sql or Err with dbt error or undefined if compilation is not finished yet */
  abstract getResult(): Result<string, string> | undefined;

  static extractDbtError(message: string): string {
    const index = message.indexOf('Compilation Error');

    if (index > -1) {
      const error = message.slice(index);
      const errorLines = error.split(EOL);
      return (errorLines.length > 3 ? errorLines.slice(0, 4).join(EOL) : message).trim();
    }
    return message.trim();
  }

  static async findCompiledFilePath(modelPath: string, dbtRepository: DbtRepository): Promise<string> {
    if (modelPath.endsWith('.sql')) {
      const model = await new ModelFetcher(dbtRepository, path.resolve(modelPath)).getModel();
      if (!model) {
        throw new Error(`Cannot find model ${modelPath}`);
      }
      return dbtRepository.getModelCompiledPath(model);
    }
    return DbtCompileJob.findCompiledFileInPackage(modelPath, dbtRepository);
  }

  static findCompiledFileInPackage(modelPath: string, dbtRepository: DbtRepository): string {
    const pathParts = modelPath.split('.');
    pathParts.splice(1, 0, 'models');
    pathParts[pathParts.length - 1] += '.sql';
    return path.resolve(dbtRepository.dbtTargetPath, 'compiled', ...pathParts);
  }
}
