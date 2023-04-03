import { BigQuery } from '@google-cloud/bigquery';
import { assertThat } from 'hamjest';
import { instance, mock, when } from 'ts-mockito';
import { BigQueryClient } from '../../bigquery/BigQueryClient';

interface CustomError extends Error {
  code: number;
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
    // arrange
    const e: CustomError = {
      name: 'unauthorized',
      message: 'unauthorized',
      code: 401,
    };
    const dataset = 'ds';
    when(mockBigQuery.dataset(dataset)).thenThrow(e);
    callCount = 0;

    // act
    await bqClient.getTableMetadata(dataset, 'table');

    // assert
    assertThat(callCount, 1);
  });
});
