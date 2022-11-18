import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { err, ok, Result } from 'neverthrow';
import { DbtProfile, TargetConfig } from '../DbtProfile';
import { DbtRepository } from '../DbtRepository';
import { DestinationDefinition } from '../DestinationDefinition';
import { SqlHeaderAnalyzer } from '../SqlHeaderAnalyzer';
import { ZetaSqlParser } from '../ZetaSqlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import { BigQueryClient } from './BigQueryClient';

export class BigQueryContext {
  private constructor(public destinationDefinition: DestinationDefinition, public zetaSqlWrapper: ZetaSqlWrapper) {}

  public static async createContext(
    dbtProfile: DbtProfile,
    targetConfig: Required<TargetConfig>,
    dbtRepository: DbtRepository,
  ): Promise<Result<BigQueryContext, string>> {
    try {
      const clientResult = await dbtProfile.createClient(targetConfig);
      if (clientResult.isErr()) {
        console.log(clientResult.error);
        return err(clientResult.error);
      }

      const bigQueryClient = clientResult.value as BigQueryClient;
      const destinationDefinition = new DestinationDefinition(bigQueryClient);

      const zetaSqlWrapper = new ZetaSqlWrapper(dbtRepository, bigQueryClient, new ZetaSqlParser(), new SqlHeaderAnalyzer());
      await zetaSqlWrapper.initializeZetaSql();

      return ok(new BigQueryContext(destinationDefinition, zetaSqlWrapper));
    } catch (e) {
      console.log(e instanceof Error ? e.stack : e);
      const message = e instanceof Error ? e.message : JSON.stringify(e);
      return err(`Data Warehouse initialization failed. ${message}`);
    }
  }

  async analyzeTable(originalFilePath: string, sql: string): Promise<Result<AnalyzeResponse__Output, string>> {
    return this.zetaSqlWrapper.analyzeTable(originalFilePath, sql);
  }

  public dispose(): void {
    this.zetaSqlWrapper
      .terminateServer()
      .catch(e => console.log(`Failed to terminate zetasql server: ${e instanceof Error ? e.message : String(e)}`));
  }
}
