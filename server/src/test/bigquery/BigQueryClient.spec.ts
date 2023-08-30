import { BigQuery } from '@google-cloud/bigquery';
import { assertThat } from 'hamjest';
import { instance, mock, when } from 'ts-mockito';
import { BigQueryClient } from '../../bigquery/BigQueryClient';

interface CustomError extends Error {
  code: number;
  response?: {
    data?: {
      error: string;
    };
  };
  data?: {
    error: string;
  };
}

describe('BigQueryClient', () => {
  let mockBigQuery: BigQuery;
  let bqClient: BigQueryClient;
  let callCount = 0;

  beforeEach(() => {
    mockBigQuery = mock(BigQuery);
    const updateCredentials = (): BigQuery => {
      callCount++;
      return instance(mockBigQuery);
    };
    bqClient = new BigQueryClient('test-project', updateCredentials);
  });

  it('should call updateCredentials in case of unauthorized error', async () => {
    await callUpdateCredentialsInCaseOfError({
      name: 'unauthorized',
      message: 'unauthorized',
      code: 401,
    });
  });

  it('should call updateCredentials in case of invalid_grant error message', async () => {
    await callUpdateCredentialsInCaseOfError({
      name: 'name',
      message: 'invalid_grant',
      code: 111,
    });
  });

  it('should call updateCredentials in case of e.data.error === invalid_grant', async () => {
    await callUpdateCredentialsInCaseOfError({
      name: 'name',
      message: 'message',
      code: 111,
      data: {
        error: 'invalid_grant',
      },
    });
  });

  it('should call updateCredentials in case of e.responsedata.error === invalid_grant', async () => {
    await callUpdateCredentialsInCaseOfError({
      name: 'name',
      message: 'message',
      code: 111,
      response: {
        data: {
          error: 'invalid_grant',
        },
      },
    });
  });

  async function callUpdateCredentialsInCaseOfError(e: CustomError): Promise<void> {
    // arrange
    const dataset = 'ds';
    when(mockBigQuery.dataset(dataset)).thenThrow(e);
    callCount = 0;

    // act
    await bqClient.getTableMetadata(dataset, 'table');

    // assert
    assertThat(callCount, 1);
  }
});
