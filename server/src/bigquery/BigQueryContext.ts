import { err, ok, Result } from 'neverthrow';
import { Emitter, Event } from 'vscode-languageserver';
import { DagNode } from '../dag/DagNode';
import { DbtProfileSuccess } from '../DbtProfileCreator';
import { DbtRepository } from '../DbtRepository';
import { DestinationDefinition } from '../DestinationDefinition';
import { AnalyzeResult, ModelsAnalyzeResult, ProjectAnalyzer } from '../ProjectAnalyzer';
import { SqlHeaderAnalyzer } from '../SqlHeaderAnalyzer';
import { ZetaSqlParser } from '../ZetaSqlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';

export class BigQueryContext {
  private static readonly ZETASQL_SUPPORTED_PLATFORMS = ['darwin', 'linux', 'win32'];
  private static readonly NOT_INITIALIZED_ERROR = 'projectAnalyzer is not initialized';

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

        const bigQueryClient = clientResult.value;
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

  async analyzeModelTree(node: DagNode, sql: string): Promise<ModelsAnalyzeResult[]> {
    if (!this.projectAnalyzer) {
      throw new Error(BigQueryContext.NOT_INITIALIZED_ERROR);
    }
    return this.projectAnalyzer.analyzeModelTree(node, sql);
  }

  async analyzeSql(sql: string): Promise<AnalyzeResult> {
    if (!this.projectAnalyzer) {
      throw new Error(BigQueryContext.NOT_INITIALIZED_ERROR);
    }
    return this.projectAnalyzer.analyzeSql(sql);
  }

  async analyzeProject(): Promise<ModelsAnalyzeResult[]> {
    if (!this.projectAnalyzer) {
      throw new Error(BigQueryContext.NOT_INITIALIZED_ERROR);
    }
    return this.projectAnalyzer.analyzeProject();
  }

  dispose(): void {
    this.projectAnalyzer?.dispose();
  }
}
