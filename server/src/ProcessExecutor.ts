import { ChildProcess, exec } from 'child_process';

export class ProcessExecutor {
  execProcess(command: string, onData?: (data: any) => void, onFail?: (error: string) => void): void {
    const process = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        if (onFail) {
          onFail(error.message);
        }
        return;
      }
      console.log(`stdout: ${stdout}`);
      console.error(`stderr: ${stderr}`);
    });

    process.stdout?.on('data', (chunk: any) => {
      if (onData) {
        onData(chunk);
      }
    });

    process.on('exit', code => {
      console.log(`Child process '${command}' exited with code ${code}`);
    });

    const exitHandler = () => {
      process.kill();
    };
    process.on('exit', exitHandler);
    // Catches Ctrl+C event
    process.on('SIGINT', exitHandler);
    // Catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler);
    process.on('SIGUSR2', exitHandler);
    process.on('uncaughtException', exitHandler);
  }
}
