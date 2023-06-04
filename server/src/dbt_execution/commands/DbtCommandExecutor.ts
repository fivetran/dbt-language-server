import { PromiseWithChild } from 'node:child_process';
import { ProcessExecutor } from '../../ProcessExecutor';
import { DbtCommand } from './DbtCommand';

// TODO: delete this class
export class DbtCommandExecutor {
  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  execute(
    command: DbtCommand,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(command.toString(), onStdoutData, onStderrData);
  }
}
