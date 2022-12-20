import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { err, ok, Result } from 'neverthrow';
import { Emitter, Event } from 'vscode-languageserver';
import { DbtProfileSuccess } from '../DbtProfileCreator';
import { DbtRepository } from '../DbtRepository';
import { DestinationDefinition } from '../DestinationDefinition';
import { ProjectAnalyzer } from '../ProjectAnalyzer';
import { SqlHeaderAnalyzer } from '../SqlHeaderAnalyzer';
import { ZetaSqlParser } from '../ZetaSqlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import { BigQueryClient } from './BigQueryClient';

export class BigQueryContext {
  private static readonly ZETASQL_SUPPORTED_PLATFORMS = ['darwin', 'linux', 'win32'];

  destinationDefinition?: DestinationDefinition;
  projectAnalyzer?: ProjectAnalyzer;

  contextInitialized = false;
  onContextInitializedEmitter = new Emitter<void>();

  isEmpty(): boolean {
    return this.projectAnalyzer === undefined;
  }

  onDestinationPrepared(): void {
    this.contextInitialized = true;
    this.onContextInitializedEmitter.fire();
  }

  get onContextInitialized(): Event<void> {
    return this.onContextInitializedEmitter.event;
  }

  async initialize(
    profileResult: DbtProfileSuccess,
    dbtRepository: DbtRepository,
    ubuntuInWslWorks: boolean,
    projectName: string | undefined,
  ): Promise<Result<void, string>> {
    if (BigQueryContext.ZETASQL_SUPPORTED_PLATFORMS.includes(process.platform) && profileResult.dbtProfile && ubuntuInWslWorks) {
      try {
        const clientResult = await profileResult.dbtProfile.createClient(profileResult.targetConfig);
        if (clientResult.isErr()) {
          console.log(clientResult.error);
          return err(clientResult.error);
        }

        const bigQueryClient = clientResult.value as BigQueryClient;
        this.destinationDefinition = new DestinationDefinition(bigQueryClient);

        this.projectAnalyzer = new ProjectAnalyzer(
          dbtRepository,
          projectName,
          bigQueryClient,
          new ZetaSqlWrapper(bigQueryClient, new ZetaSqlParser(), new SqlHeaderAnalyzer()),
        );
        await this.projectAnalyzer.initialize();
      } catch (e) {
        console.log(e instanceof Error ? e.stack : e);
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        this.onDestinationPrepared();
        return err(`BigQuery initialization failed. ${message}`);
      }
    }
    this.onDestinationPrepared();
    return ok(undefined);
  }

  async analyzeTable(fullFilePath: string, sql: string): Promise<Result<AnalyzeResponse__Output, string>> {
    return this.projectAnalyzer?.analyzeTable(fullFilePath, sql) ?? err('Project analyzer is not initialized');
  }

  dispose(): void {
    this.projectAnalyzer?.dispose();
  }
}
