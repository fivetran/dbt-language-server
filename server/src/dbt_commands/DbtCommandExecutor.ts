import { PromiseWithChild } from 'child_process';
import { ProcessExecutor } from '../ProcessExecutor';
import { Command } from './Command';

export class DbtCommandExecutor {
  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  execute(
    command: Command,
    onStdoutData?: (data: any) => void,
    onStderrData?: (data: any) => void,
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(command.toString(), onStdoutData, onStderrData, command.env);
  }
}
