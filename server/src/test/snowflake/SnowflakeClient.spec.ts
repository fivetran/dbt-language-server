import { ok } from 'node:assert';
import { createConnection } from 'snowflake-sdk';
import { SnowflakeClient } from '../../snowflake/SnowflakeClient';

describe('SnowflakeClient', () => {
  // Test with a real Snowflake account
  it.skip('Should pass test', async () => {
    // arrange
    const connection = createConnection({
      account: '',
      username: '',
      password: '',
    });
    const client = new SnowflakeClient('db', connection);

    // act
    const result = await client.test();

    // assert
    ok(result.isOk());
  });
});
