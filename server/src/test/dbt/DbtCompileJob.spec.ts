import { assertThat } from 'hamjest';
import { err, ok } from 'neverthrow';
import { instance, mock, verify, when } from 'ts-mockito';
import { DbtRepository } from '../../DbtRepository';
import { CompileResponse, DbtRpcClient, PollResponse } from '../../dbt_execution/DbtRpcClient';
import { DbtRpcCompileJob } from '../../dbt_execution/DbtRpcCompileJob';

describe('DbtCompileJob', () => {
  const MODEL = 'test_model';
  const TOKEN = 'test_token';
  const COMPILED_SQL = 'compiled sql';
  const COMPILE_MODEL_ERROR = 'compile model error';

  function compileModelError(): Promise<CompileResponse> {
    return Promise.resolve({
      result: {
        request_token: '',
      },
      error: {
        data: {
          message: COMPILE_MODEL_ERROR,
        },
      },
    });
  }

  function compileModelSuccess(): Promise<CompileResponse> {
    return Promise.resolve({
      result: {
        request_token: TOKEN,
      },
    });
  }

  function pollOnceCompileResultSuccess(): Promise<PollResponse> {
    return Promise.resolve({
      result: {
        state: 'success',
        elapsed: 0,
        results: [
          {
            node: {
              compiled_sql: COMPILED_SQL,
            },
          },
        ],
      },
    });
  }

  function pollOnceCompileResultRunning(): Promise<PollResponse> {
    return Promise.resolve({
      result: {
        state: 'running',
        elapsed: 0,
      },
    });
  }

  function pollOnceCompileResultError(): Promise<PollResponse> {
    return Promise.resolve({
      result: {
        state: 'success',
        elapsed: 0,
      },
      error: {
        data: {
          message: COMPILE_MODEL_ERROR,
        },
      },
    });
  }

  function createDbtRpcCompileJob(mockDbtRpcClient: DbtRpcClient): DbtRpcCompileJob {
    return new DbtRpcCompileJob(MODEL, mock(DbtRepository), instance(mockDbtRpcClient));
  }

  beforeEach(() => {
    DbtRpcCompileJob.COMPILE_MODEL_MAX_RETRIES = 10;
    DbtRpcCompileJob.COMPILE_MODEL_TIMEOUT_MS = 0;

    DbtRpcCompileJob.POLL_MAX_RETRIES = 86;
    DbtRpcCompileJob.POLL_TIMEOUT_MS = 0;
    DbtRpcCompileJob.MAX_RETRIES_FOR_UNKNOWN_ERROR = 5;
  });

  it('Should return ok result', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compile(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(1);
  });
  it('Should retry in case of compileModel error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(compileModelError()).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compile(MODEL)).times(2);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(1);
  });

  it('Should retry in case of compileModel returns undefined', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(Promise.resolve(undefined)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compile(MODEL)).times(2);
  });

  it('Should retry compileModel max times and fail due to network error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtRpcCompileJob.COMPILE_MODEL_MAX_RETRIES = 1;

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(Promise.resolve(undefined));

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(DbtRpcCompileJob.NETWORK_ERROR));
    verify(mockDbtRpcClient.compile(MODEL)).times(DbtRpcCompileJob.COMPILE_MODEL_MAX_RETRIES + 1);
  });

  it('Should retry compileModel max times and fail due to dbt-rpc error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtRpcCompileJob.COMPILE_MODEL_MAX_RETRIES = 1;

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(Promise.resolve(undefined)).thenReturn(compileModelError());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(COMPILE_MODEL_ERROR));
    verify(mockDbtRpcClient.compile(MODEL)).times(DbtRpcCompileJob.COMPILE_MODEL_MAX_RETRIES + 1);
  });

  it('Should stop compileModel during retrying', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtRpcCompileJob.COMPILE_MODEL_TIMEOUT_MS = 300;

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(Promise.resolve(compileModelSuccess())).thenReturn(compileModelSuccess());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);
    const startPromise = compileJob.start();

    // act
    await compileJob.forceStop();
    await startPromise;

    // assert
    assertThat(compileJob.result, err(DbtRpcCompileJob.STOP_ERROR));
    verify(mockDbtRpcClient.compile(MODEL)).once();
  });

  it('Should retry in case of pollOnceCompileResult returns "running" state', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultRunning()).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compile(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(2);
  });

  it('Should retry in case of pollOnceCompileResultRunning returns undefined', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(Promise.resolve(undefined)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compile(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(2);
  });

  it('Should retry maximum MAX_RETRIES_FOR_UNKNOWN_ERROR in case of pollOnceCompileResultRunning returns undefined', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtRpcCompileJob.MAX_RETRIES_FOR_UNKNOWN_ERROR = 2;

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(Promise.resolve(undefined));

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(DbtRpcCompileJob.NETWORK_ERROR));
    verify(mockDbtRpcClient.compile(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(DbtRpcCompileJob.MAX_RETRIES_FOR_UNKNOWN_ERROR + 1);
  });

  it('Should return error in case of pollOnceCompileResultRunning returns error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compile(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultError());

    const compileJob = createDbtRpcCompileJob(mockDbtRpcClient);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(COMPILE_MODEL_ERROR));
    verify(mockDbtRpcClient.compile(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(1);
  });
});
