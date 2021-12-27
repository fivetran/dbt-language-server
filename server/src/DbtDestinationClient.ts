export interface DbtDestinationClient {
  /**
   * Test credentials validity
   * @param client profile client
   * @returns undefined in case of credentials valid and error string otherwise
   */
  test(): Promise<string | undefined>;
}
