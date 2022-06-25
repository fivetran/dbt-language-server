import { ExecException } from 'child_process';
import { DbtRpcClient } from './DbtRpcClient';
import { Command } from './dbt_commands/Command';
import { DbtCommandExecutor } from './dbt_commands/DbtCommandExecutor';
import { deferred } from './utils/Utils';

export class DbtRpcServer {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();

  static readonly MESSAGE_PATTERN = /"message": "(.*?)"/g;
  static readonly DATE_PATTERN = /\d\d:\d\d:\d\d/g;

  startDeferred = deferred<void>();

  private dbtRpcClient?: DbtRpcClient;
  private rpcPid?: number;
  private disposed = false;

  async startDbtRpc(command: Command, dbtRpcClient: DbtRpcClient): Promise<void> {
    this.dbtRpcClient = dbtRpcClient;

    let started = false;
    console.log(`Starting dbt-rpc: ${command.toString()}`);
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
            // The server is started here but there is some problem with project compilation
            console.log(e);
          }
          console.log('dbt-rpc started');
          if (!this.rpcPid) {
            this.startDeferred.reject(new Error("Couldn't find dbt-rpc process id"));
          }
          started = true;
          this.startDeferred.resolve();
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
      } else {
        error = 'Unknown dbt-rpc error';
      }

      this.startDeferred.reject(new Error(error));
    });

    promiseWithChild.child.on('exit', async _code => {
      if (!this.disposed) {
        await this.startDbtRpc(command, dbtRpcClient);
      }
    });

    return this.startDeferred.promise;
  }

  async ensureCompilationFinished(): Promise<void> {
    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        const status = await this.dbtRpcClient?.getStatus();
        if (status) {
          switch (status.result.state) {
            case 'compiling':
              break;
            case 'ready':
              clearInterval(intervalId);
              resolve();
              break;
            case 'error':
              clearInterval(intervalId);
              reject(status.result.error);
              break;
            default:
              console.log('State is not supported');
              break;
          }
        }
      }, 300);
    });
  }

  refreshServer(): void {
    if (this.rpcPid) {
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
