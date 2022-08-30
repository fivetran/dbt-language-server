import axios from 'axios';
import { v4 as uuid } from 'uuid';

export interface PollResponse extends Response {
  result: {
    state: string;
    elapsed: number;
    results?: CompileResult[];
  };
}

export interface CompileResult {
  node: {
    compiled_sql: string;
  };
}

export interface CompileResponse extends Response {
  result: {
    request_token: string;
  };
}

export interface StatusResponse extends Response {
  result: {
    state: State;
    pid: number;
    error?: {
      message: string;
    };
  };
}

type State = 'ready' | 'compiling' | 'error';

type Method = 'status' | 'compile' | 'poll' | 'kill' | 'deps';

interface PostData {
  jsonrpc: '2.0';
  method: Method;
  id: string;
  params?: StatusParams | CompileParams | PollParams | KillParams;
}

interface Params {
  timeout?: number;
}

type StatusParams = Params;

interface CompileParams extends Params {
  threads?: string;
  models?: string;
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
    code?: number;
    data?: {
      message?: string;
    };
  };
}

export class DbtRpcClient {
  static DEFAULT_POST_REQUEST_TIMEOUT = 10000;

  private port?: number;
  private postRequestTimeout: number;

  constructor() {
    this.postRequestTimeout = this.initPostRequestTimeout();
  }

  initPostRequestTimeout(): number {
    if (process.env['DBT_LS_POST_REQUEST_TIMEOUT']) {
      const timeout = parseInt(process.env['DBT_LS_POST_REQUEST_TIMEOUT']);
      return isNaN(timeout) ? DbtRpcClient.DEFAULT_POST_REQUEST_TIMEOUT : timeout;
    }
    return DbtRpcClient.DEFAULT_POST_REQUEST_TIMEOUT;
  }

  setPort(port: number): void {
    this.port = port;
  }

  private getDefaultPostData(method: Method): PostData {
    return {
      jsonrpc: '2.0',
      method,
      id: uuid(),
      params: {},
    };
  }

  async getStatus(): Promise<StatusResponse | undefined> {
    const data = this.getDefaultPostData('status');
    data.params = { timeout: 1 };

    return this.makePostRequest<StatusResponse>(data);
  }

  async compile(modelPath?: string): Promise<CompileResponse | undefined> {
    const data = this.getDefaultPostData('compile');
    data.params = { models: modelPath };

    return this.makePostRequest<CompileResponse>(data);
  }

  async pollOnceCompileResult(requestToken: string): Promise<PollResponse | undefined> {
    const data = this.getDefaultPostData('poll');
    data.params = {
      request_token: requestToken,
      logs: false,
    };

    return this.makePostRequest<PollResponse>(data);
  }

  async kill(requestToken: string): Promise<void> {
    const data = this.getDefaultPostData('kill');
    data.params = {
      task_id: requestToken,
      timeout: 1,
    };

    await this.makePostRequest<never>(data);
  }

  async deps(): Promise<void> {
    const data = this.getDefaultPostData('deps');

    await this.makePostRequest<never>(data);
  }

  async makePostRequest<T extends Response>(postData: PostData): Promise<T | undefined> {
    try {
      const response = await axios.post<T>(`http://localhost:${String(this.port)}/jsonrpc`, postData, {
        timeout: this.postRequestTimeout,
        headers: { 'Content-Type': 'application/json' },
      });
      return response.data;
    } catch (e) {
      console.log(`Error while sending request ${JSON.stringify(postData)}: ${e instanceof Error ? e.message : String(e)}`);
      return undefined;
    }
  }
}
