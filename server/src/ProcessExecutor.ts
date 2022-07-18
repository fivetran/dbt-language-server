import { exec, PromiseWithChild } from 'child_process';
import { promisify } from 'util';
import { LogLevel } from './LspServer';

export class ProcessExecutor {
  execProcess(
    command: string,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
    envVars?: NodeJS.ProcessEnv,
  ): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    console.log(`Run process '${command}'`, LogLevel.Debug);

    const promisifiedExec = promisify(exec);

    const { env } = process;
    if (envVars) {
      Object.keys(envVars).forEach(k => (env[k] = envVars[k]));
    }
    const promiseWithChild = promisifiedExec(command, envVars ? { env } : {});
    const childProcess = promiseWithChild.child;

    childProcess.stderr?.on('data', chunk => {
      if (onStderrData) {
        onStderrData(String(chunk));
      }
    });
    childProcess.stdout?.on('data', chunk => {
      if (onStdoutData) {
        onStdoutData(String(chunk));
      }
    });
    childProcess.on('exit', code => {
      console.log(`Process '${command}' exited with code ${String(code)}`);
    });

    const kill = (): boolean => childProcess.kill();

    childProcess.on('exit', kill);
    // Catches Ctrl+C event
    childProcess.on('SIGINT', kill);
    // Catches "kill pid" (for example: nodemon restart)
    childProcess.on('SIGUSR1', kill);
    childProcess.on('SIGUSR2', kill);
    childProcess.on('uncaughtException', kill);
    return promiseWithChild;
  }
}
