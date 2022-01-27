import { assertThat } from 'hamjest';
import { err, ok } from 'neverthrow';
import { instance, mock, verify, when } from 'ts-mockito';
import { DbtCompileJob } from '../DbtCompileJob';
import { CompileResponse, DbtRpcClient, PollResponse } from '../DbtRpcClient';

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

  beforeEach(() => {
    DbtCompileJob.COMPILE_MODEL_MAX_RETRIES = 10;
    DbtCompileJob.COMPILE_MODEL_TIMEOUT_MS = 0;

    DbtCompileJob.POLL_MAX_RETRIES = 86;
    DbtCompileJob.POLL_TIMEOUT_MS = 0;
    DbtCompileJob.MAX_RETRIES_FOR_UNKNOWN_ERROR = 5;
  });

  it('Should return ok result', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(1);
  });
  it('Should retry in case of compileModel error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(compileModelError()).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(2);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(1);
  });

  it('Should retry in case of compileModel returns undefined', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(Promise.resolve(undefined)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(2);
  });

  it('Should retry compileModel max times and fail due to network error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtCompileJob.COMPILE_MODEL_MAX_RETRIES = 1;

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(Promise.resolve(undefined));

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(DbtCompileJob.NETWORK_ERROR));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(DbtCompileJob.COMPILE_MODEL_MAX_RETRIES + 1);
  });

  it('Should retry compileModel max times and fail due to dbt-rpc error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtCompileJob.COMPILE_MODEL_MAX_RETRIES = 1;

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(Promise.resolve(undefined)).thenReturn(compileModelError());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(COMPILE_MODEL_ERROR));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(DbtCompileJob.COMPILE_MODEL_MAX_RETRIES + 1);
  });

  it('Should stop compileModel during retrying', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtCompileJob.COMPILE_MODEL_TIMEOUT_MS = 300;

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(Promise.resolve(compileModelSuccess())).thenReturn(compileModelSuccess());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);
    const startPromise = compileJob.start();

    // act
    await compileJob.stop();
    await startPromise;

    // assert
    assertThat(compileJob.result, err(DbtCompileJob.STOP_ERROR));
    verify(mockDbtRpcClient.compileModel(MODEL)).once();
  });

  it('Should retry in case of pollOnceCompileResult returns "running" state', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultRunning()).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(2);
  });

  it('Should retry in case of pollOnceCompileResultRunning returns undefined', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(Promise.resolve(undefined)).thenReturn(pollOnceCompileResultSuccess());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, ok(COMPILED_SQL));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(2);
  });

  it('Should retry maximum MAX_RETRIES_FOR_UNKNOWN_ERROR in case of pollOnceCompileResultRunning returns undefined', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    DbtCompileJob.MAX_RETRIES_FOR_UNKNOWN_ERROR = 2;

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(Promise.resolve(undefined));

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(DbtCompileJob.NETWORK_ERROR));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(DbtCompileJob.MAX_RETRIES_FOR_UNKNOWN_ERROR + 1);
  });

  it('Should return error in case of pollOnceCompileResultRunning returns error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);

    when(mockDbtRpcClient.compileModel(MODEL)).thenReturn(compileModelSuccess());
    when(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).thenReturn(pollOnceCompileResultError());

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), MODEL);

    // act
    await compileJob.start();

    // assert
    assertThat(compileJob.result, err(COMPILE_MODEL_ERROR));
    verify(mockDbtRpcClient.compileModel(MODEL)).times(1);
    verify(mockDbtRpcClient.pollOnceCompileResult(TOKEN)).times(1);
  });
});
