import { err, ok, Result } from 'neverthrow';
import * as snowflake from 'snowflake-sdk';
import { DbtDestinationClient } from '../DbtDestinationClient';

export class SnowflakeClient implements DbtDestinationClient {
  constructor(private connection: snowflake.Connection) {}

  test(): Promise<Result<void, string>> {
    return new Promise<Result<void, string>>(resolve => {
      this.connection.connect(error => {
        if (error) {
          const errorMessage = `Test connection failed. Reason: ${error.message}.`;
          console.log(errorMessage);
          resolve(err(errorMessage));
        }
        resolve(ok(undefined));
      });
    });
  }
}
