import { DbtRepository } from '../DbtRepository';
import { DbtCompileJob } from './DbtCompileJob';

export enum DbtMode {
  DBT_RPC,
  CLI,
}

export interface Dbt {
  refresh(): void;

  isReady(): Promise<void>;

  prepare(dbtProfileType?: string): Promise<void>;

  /** @returns undefined when ready and string error otherwise */
  getStatus(): Promise<string | undefined>;

  createCompileJob(modelPath: string, dbtRepository: DbtRepository): DbtCompileJob;

  dispose(): void;
}
