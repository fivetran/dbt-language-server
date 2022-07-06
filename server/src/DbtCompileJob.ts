import { Result } from 'neverthrow';

export abstract class DbtCompileJob {
  abstract start(): Promise<void>;

  abstract forceStop(): Promise<void>;

  /** @returns Ok with compiled sql or Err with dbt error or undefined if compilation is not finished yet */
  abstract getResult(): Result<string, string> | undefined;

  extractDbtError(message: string): string {
    const index = message.indexOf('Compilation Error');
    return (index !== -1 ? message.substring(index) : message).trim();
  }
}
