export interface DbtDestinationClient {
  /**
   * Tests connection to destination
   * @param client dbt profile client
   * @returns undefined in case of connection successful and error string otherwise
   */
  test(): Promise<string | undefined>;
}
