export interface DbtDestinationClient {
  /**
   * Tests connection to destination
   * @returns undefined in case of connection successful and error string otherwise
   */
  test(): Promise<string | undefined>;
}
