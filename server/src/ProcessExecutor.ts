import { exec, PromiseWithChild } from 'child_process';
import { promisify } from 'util';

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
    const promisifiedExec = promisify(exec);

    const { env } = process;
    if (envVars) {
      Object.keys(envVars).forEach(k => (env[k] = envVars[k]));
    }
    const promiseWithChild = promisifiedExec(command, envVars ? { env } : {});
    const childProcess = promiseWithChild.child;

    childProcess.stderr?.on('data', chunk => {
      if (onStderrData) {
        onStderrData(chunk);
      }
    });
    childProcess.stdout?.on('data', chunk => {
      if (onStdoutData) {
        onStdoutData(chunk);
      }
    });
    childProcess.on('exit', code => {
      console.log(`Child process '${command}' exited with code ${code}`);
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
