import { ExecException } from 'node:child_process';
import { LogLevel } from '../Logger';
import { DbtRpcClient } from './DbtRpcClient';
import { Command } from './commands/Command';
import { DbtCommandExecutor } from './commands/DbtCommandExecutor';

export class DbtRpcServer {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();

  static readonly MESSAGE_PATTERN = /"message": "(.*?)"/g;
  static readonly DATE_PATTERN = /\d\d:\d\d:\d\d/g;

  private dbtRpcClient?: DbtRpcClient;
  private rpcPid?: number;
  private disposed = false;

  async startDbtRpc(command: Command, dbtRpcClient: DbtRpcClient): Promise<void> {
    this.dbtRpcClient = dbtRpcClient;

    let started = false;
    console.log(`Starting dbt-rpc: ${command.toString()}`);
    return new Promise((resolve, reject) => {
      const promiseWithChild = DbtRpcServer.DBT_COMMAND_EXECUTOR.execute(command, async (data: string) => {
        if (!started) {
          if (!this.rpcPid) {
            const matchResults = data.match(/"process": (\d*)/);
            if (matchResults?.length === 2) {
              this.rpcPid = Number(matchResults[1]);
            }
          }

          if (data.includes('Serving RPC server')) {
            try {
              await this.ensureCompilationFinished();
            } catch (e) {
              // The server is started here but there is some problem with project compilation. One of the possible problems is packages are not installed
              if (e instanceof Error && e.message.includes('dbt deps')) {
                dbtRpcClient.deps().catch(e_ => console.log(`Error while running dbt deps: ${e_ instanceof Error ? e_.message : String(e_)}`));
              }
              console.log(e);
            }
            console.log('dbt-rpc started');
            if (!this.rpcPid) {
              reject(new Error("Couldn't find dbt-rpc process id"));
            }
            started = true;
            resolve();
          }
        }
      });

      promiseWithChild.catch((e: ExecException & { stdout?: string; stderr?: string }) => {
        let m: RegExpExecArray | null;
        let error = '';

        if (e.stdout) {
          while ((m = DbtRpcServer.MESSAGE_PATTERN.exec(e.stdout))) {
            if (m.length === 2) {
              const message = m[1].replaceAll('\\n', '').replaceAll(DbtRpcServer.DATE_PATTERN, '');
              error += `${message} `;
            }
          }
        } else if (e.stderr) {
          error = e.stderr;
        } else {
          error = 'Unknown dbt-rpc error';
        }

        reject(new Error(error));
      });

      promiseWithChild.child.on('exit', async code => {
        if (!this.disposed && code !== 1) {
          console.log(`dbt-rpc unexpectedly exited with code ${code ?? 'null'} and will be restarted`);
          await this.startDbtRpc(command, dbtRpcClient);
        }
      });
    });
  }

  /** Compilation can be started after server received SIGHUP signal */
  async ensureCompilationFinished(): Promise<void> {
    return new Promise((resolve, reject) => {
      const maxCheckCount = 100;
      let checkCount = 0;
      const intervalId = setInterval(async () => {
        checkCount++;
        const status = await this.dbtRpcClient?.getStatus();
        if (status) {
          switch (status.result.state) {
            case 'compiling': {
              break;
            }
            case 'ready': {
              clearInterval(intervalId);
              resolve();
              break;
            }
            case 'error': {
              clearInterval(intervalId);
              reject(new Error(status.result.error?.message));
              break;
            }
            default: {
              console.log('State is not supported');
              break;
            }
          }
        }
        if (checkCount >= maxCheckCount) {
          clearInterval(intervalId);
          reject(new Error('Status timeout exceeded'));
        }
      }, 300);
    });
  }

  refresh(): void {
    if (this.rpcPid) {
      console.log('SIGHUP', LogLevel.Debug);
      process.kill(this.rpcPid, 'SIGHUP');
    }
  }

  dispose(): void {
    this.disposed = true;
    if (this.rpcPid) {
      process.kill(this.rpcPid, 'SIGTERM');
    }
  }
}
