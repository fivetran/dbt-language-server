import { Result } from 'neverthrow';

export interface DbtCompileJob {
  start(): Promise<void>;

  forceStop(): Promise<void>;

  /** @returns result Ok with compiled sql or Err with dbt error or undefined if job is not completed yet */
  getResult(): Result<string, string> | undefined;
}
