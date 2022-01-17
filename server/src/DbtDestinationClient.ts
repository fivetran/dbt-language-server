import { Result } from 'neverthrow';

export interface DbtDestinationClient {
  /**
   * Tests connection to destination
   * @returns Ok in case of connection successful and Err otherwise
   */
  test(): Promise<Result<void, string>>;
}
