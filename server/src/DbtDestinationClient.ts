import { Result } from 'neverthrow';

export interface DbtDestinationClient {
  /**
   * Tests connection to destination
   * @returns empty in case of connection successful and error string otherwise
   */
  test(): Promise<Result<void, string>>;
}
