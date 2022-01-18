import assert = require('assert');
import { instance, mock, when } from 'ts-mockito';
import { DbtCompileJob } from '../DbtCompileJob';
import { DbtRpcClient } from '../DbtRpcClient';

describe('DbtCompileJob', () => {
  it('Should return result after run an poll', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    const expectedResult = {
      result: {
        state: 'state',
        elapsed: 0,
      },
    };
    when(mockDbtRpcClient.compileModel('test')).thenReturn(
      Promise.resolve({
        result: {
          request_token: 'token',
        },
      }),
    );
    when(mockDbtRpcClient.pollOnceCompileResult('token')).thenReturn(Promise.resolve(expectedResult));

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), 'test');
    await compileJob.runCompile();

    // act
    const result = await compileJob.getResult();

    // assert
    assert.strictEqual(result, expectedResult);
  });

  it('Should retry in case of compileModel error', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    const expectedResult = {
      result: {
        state: 'state',
        elapsed: 0,
      },
    };
    when(mockDbtRpcClient.compileModel('test'))
      .thenReturn(
        Promise.resolve({
          result: {
            request_token: '',
          },
          error: {
            data: {
              message: 'error',
            },
          },
        }),
      )
      .thenReturn(
        Promise.resolve({
          result: {
            request_token: 'token',
          },
        }),
      );
    when(mockDbtRpcClient.pollOnceCompileResult('token')).thenReturn(Promise.resolve(expectedResult));

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), 'test');
    await compileJob.runCompile();
    await compileJob.getResult();

    // act
    const result = await compileJob.getResult();

    // assert
    assert.strictEqual(result, expectedResult);
    assert.strictEqual(compileJob.tryCount, 2);
  });

  it('Should retry in case of compileModel returns undefined', async () => {
    // arrange
    const mockDbtRpcClient = mock(DbtRpcClient);
    const expectedResult = {
      result: {
        state: 'state',
        elapsed: 0,
      },
    };
    when(mockDbtRpcClient.compileModel('test')).thenReturn(Promise.resolve(undefined));
    when(mockDbtRpcClient.pollOnceCompileResult('token')).thenReturn(Promise.resolve(expectedResult));

    const compileJob = new DbtCompileJob(instance(mockDbtRpcClient), 'test');
    await compileJob.runCompile();

    // act, assert
    for (let i = 0; i < DbtCompileJob.MAX_RETRIES - 1; i++) {
      const result = await compileJob.getResult();
      assert.strictEqual(result, undefined);
    }
    const result = await compileJob.getResult();
    assert.strictEqual(result?.error?.data?.message, DbtCompileJob.UNKNOWN_ERROR);
  });
});
