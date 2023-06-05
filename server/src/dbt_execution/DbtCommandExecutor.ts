import { PromiseWithChild } from 'node:child_process';
import { ProcessExecutor } from '../ProcessExecutor';

export class DbtCommandExecutor {
  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  constructor(private python: string, private scriptPath: string) {}

  compile(
    macroCompilatorPort: number,
    profilesDir: string,
    onStdoutData: (data: string) => void,
    onStderrData: (data: string) => void,
    params: string[],
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(
      `${this.python} ${this.scriptPath} ${macroCompilatorPort} ${profilesDir} compile ${params.join(' ')}`,
      onStdoutData,
      onStderrData,
    );
  }

  deps(
    macroCompilatorPort: number,
    profilesDir: string,
    onStdoutData: (data: string) => void,
    onStderrData: (data: string) => void,
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(
      `${this.python} ${this.scriptPath} ${macroCompilatorPort} ${profilesDir} deps'`,
      onStdoutData,
      onStderrData,
    );
  }

  version(): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(`${this.python} ${this.scriptPath} --version`);
  }
}
