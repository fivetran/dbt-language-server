import axios from 'axios';
import * as child from 'child_process';
import { v4 as uuid } from 'uuid';
import { ProcessExecutor } from './ProcessExecutor';
import { deferred } from './Utils';

interface PostData {
  jsonrpc: '2.0';
  method: 'status' | 'compile' | 'compile_sql' | 'poll' | 'kill';
  id: string;
  params?: StatusParams | CompileModelParams | CompileSqlParams | PollParams | KillParams;
}

interface Params {
  timeout?: number;
}

type StatusParams = Params;

interface CompileModelParams extends Params {
  threads?: string;
  models: string;
}

interface CompileSqlParams extends Params {
  sql: string;
  name: string;
}

interface PollParams extends Params {
  request_token: string;
  logs: false;
}

interface KillParams extends Params {
  task_id: string;
}

interface Response {
  error?: {
    data?: {
      message?: string;
    };
  };
}

export interface StatusResponse extends Response {
  result: {
    state: 'ready' | 'compiling' | 'error';
    pid: number;
    error?: {
      message: string;
    };
  };
}

export interface CompileResponse extends Response {
  result: {
    request_token: string;
  };
}

export interface PollResponse extends Response {
  result: {
    state: string;
    elapsed: number;
    results?: CompileResult[];
  };
}

export interface CompileResult {
  status: string;
  node: {
    compiled: boolean;
    compiled_sql: string;
  };
}

export class DbtServer {
  static PORT = '8588';
  static NO_VERSION_CHECK = '--no-version-check';
  static VERSIOIN = '--version';
  static processExecutor = new ProcessExecutor();

  pid = -1;
  dbtVersion: string | undefined;
  python: string | undefined;
  startDeferred = deferred<void>();

  async startDbtRpc(getPython: () => Promise<string>): Promise<void> {
    const existingRpc = child.spawnSync('lsof', [`-ti:${DbtServer.PORT}`]);
    const pids = String(existingRpc.stdout).split(/\n|\r/g);
    child.spawn('kill', pids);

    let started = false;

    try {
      await this.findDbtCommand(getPython);
      const command = this.dbtCommand(['--partial-parse', 'rpc', '--port', `${DbtServer.PORT}`, `${DbtServer.NO_VERSION_CHECK}`]);

      void DbtServer.processExecutor.execProcess(command, async (data: any) => {
        if (!started) {
          const str = <string>data;
          const matchResults = str.match(/"Running with dbt=(.*?)"/);
          if (matchResults?.length === 2) {
            this.dbtVersion = matchResults[1];
          }
          if (str.indexOf('Serving RPC server') > -1) {
            try {
              await this.ensureCompilationFinished();
            } catch (e) {
              // The server is started here but there is some problem with project compilation
              console.log(e);
            }
            console.log('dbt rpc started');
            started = true;
            this.startDeferred.resolve();
          }
        }
      });

      return this.startDeferred.promise;
    } catch (e) {
      this.startDeferred.reject(e);
    }
  }

  async ensureCompilationFinished(): Promise<void> {
    return new Promise((resolve, reject) => {
      const intervalId = setInterval(async () => {
        const status = await this.getStatus();
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
          }
        }
      }, 300);
    });
  }

  async findDbtCommand(getPython: () => Promise<string>): Promise<void> {
    try {
      await DbtServer.processExecutor.execProcess(`dbt ${DbtServer.VERSIOIN}`);
    } catch (e) {
      console.log('Failed to find dbt command', e);
      this.python = await getPython();
      await DbtServer.processExecutor.execProcess(this.dbtPythonCommand([DbtServer.VERSIOIN]));
      console.log(`Using dbt via python: ${this.python}`);
    }
  }

  dbtCommand(parameters: string[]): string {
    return this.python ? this.dbtPythonCommand(parameters) : `dbt ${parameters.join(' ')}`;
  }

  dbtPythonCommand(parameters: string[]): string {
    const quotedParameters = parameters.map(p => `"${p}"`).toString();
    return `${this.python} -c 'import dbt.main; dbt.main.main([${quotedParameters}])'`;
  }

  refreshServer(): void {
    if (this.pid !== -1) {
      child.spawnSync('kill', ['-HUP', this.pid.toString()]);
      console.log(`kill -HUP ${this.pid}`);
    }
  }

  async generateManifest(): Promise<void> {
    const command = this.dbtCommand(['compile', `${DbtServer.NO_VERSION_CHECK}`]);
    await DbtServer.processExecutor.execProcess(command);
  }

  async getCurrentStatus(): Promise<StatusResponse | undefined> {
    await this.startDeferred.promise;
    const statusRespopnse = await this.getStatus();
    if (statusRespopnse?.result.pid) {
      this.pid = statusRespopnse?.result.pid;
    }
    return statusRespopnse;
  }

  async getStatus(): Promise<StatusResponse | undefined> {
    const data: PostData = {
      jsonrpc: '2.0',
      method: 'status',
      id: uuid(),
      params: {
        timeout: 1,
      },
    };

    return await this.makePostRequest<StatusResponse>(data);
  }

  async compileModel(modelName: string): Promise<CompileResponse | undefined> {
    const data: PostData = {
      jsonrpc: '2.0',
      method: 'compile',
      id: uuid(),
      params: {
        models: modelName,
      },
    };

    return await this.makePostRequest<CompileResponse>(data);
  }

  async compileSql(sql: string): Promise<CompileResponse> {
    const data: PostData = {
      jsonrpc: '2.0',
      method: 'compile_sql',
      id: uuid(),
      params: {
        timeout: 60,
        sql: Buffer.from(sql).toString('base64'),
        name: 'compile_sql',
      },
    };

    const result = await this.makePostRequest<CompileResponse>(data);
    if (!result) {
      return {
        result: { request_token: '' },
        error: {
          data: {
            message: 'Error while running compile sql',
          },
        },
      };
    }
    return result;
  }

  async pollOnceCompileResult(requestToken: string): Promise<PollResponse | undefined> {
    const data: PostData = {
      jsonrpc: '2.0',
      method: 'poll',
      id: uuid(),
      params: {
        request_token: requestToken,
        logs: false,
      },
    };

    return await this.makePostRequest<PollResponse>(data);
  }

  async kill(requestToken: string): Promise<void> {
    const data: PostData = {
      jsonrpc: '2.0',
      method: 'kill',
      id: uuid(),
      params: {
        task_id: requestToken,
        timeout: 1,
      },
    };

    await this.makePostRequest<any>(data);
  }

  async makePostRequest<T extends Response>(postData: unknown): Promise<T | undefined> {
    try {
      const response = await axios.post<T>(`http://localhost:${DbtServer.PORT}/jsonrpc`, postData, { timeout: 6000 });
      // console.log(response);
      const { data } = response;
      if (data?.error?.data?.message) {
        const message = data?.error?.data?.message;
        if (message && message.indexOf('invalid_grant') > 0) {
          console.warn('Reauth required for dbt!');
          return;
        }
      }
      return data;
    } catch (error) {
      console.error(error);
    }
    return undefined;
  }
}
