import { PromiseWithChild } from 'node:child_process';
import { ProcessExecutor } from '../ProcessExecutor';

export class DbtCommandExecutor {
  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  compile(
    python: string,
    scriptPath: string,
    macroCompilatorPort: number,
    profilesDir: string,
    onStdoutData: (data: string) => void,
    onStderrData: (data: string) => void,
    ...params: string[]
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(
      `${python} ${scriptPath} ${macroCompilatorPort} ${profilesDir} compile ${params.join(' ')}`,
      onStdoutData,
      onStderrData,
    );
  }

  deps(
    python: string,
    scriptPath: string,
    macroCompilatorPort: number,
    profilesDir: string,
    onStdoutData: (data: string) => void,
    onStderrData: (data: string) => void,
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(
      `${python} ${scriptPath} ${macroCompilatorPort} ${profilesDir} deps'`,
      onStdoutData,
      onStderrData,
    );
  }

  version(
    python: string,
    scriptPath: string,
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(`${python} ${scriptPath} '--version'`);
  }
}
