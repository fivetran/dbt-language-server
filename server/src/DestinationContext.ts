import { Err, err, ok, Result } from 'neverthrow';
import { Emitter, Event } from 'vscode-languageserver';
import { DagNode } from './dag/DagNode';
import { DbtProfileSuccess } from './DbtProfileCreator';
import { DbtRepository } from './DbtRepository';
import { DestinationDefinition } from './DestinationDefinition';
import { AnalyzeResult, AnalyzeTrackerFunc, ModelsAnalyzeResult, ProjectAnalyzer } from './ProjectAnalyzer';
import { SqlHeaderAnalyzer } from './SqlHeaderAnalyzer';
import { ZetaSqlParser } from './ZetaSqlParser';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

export class DestinationContext {
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
    projectName: string,
  ): Promise<Result<void, string>> {
    if (profileResult.dbtProfile && this.canUseDestination(profileResult, ubuntuInWslWorks)) {
      try {
        const clientResult = await profileResult.dbtProfile.createClient(profileResult.targetConfig);
        if (clientResult.isErr()) {
          return this.onError(clientResult.error);
        }

        const destinationClient = clientResult.value;
        this.destinationDefinition = new DestinationDefinition(destinationClient);

        this.projectAnalyzer = new ProjectAnalyzer(
          dbtRepository,
          projectName,
          destinationClient,
          new ZetaSqlWrapper(destinationClient, new ZetaSqlParser(), new SqlHeaderAnalyzer()),
        );
        await this.projectAnalyzer.initialize();
      } catch (e) {
        const message = e instanceof Error ? e.message : JSON.stringify(e);
        return this.onError(message);
      }
    }
    this.onDestinationPrepared();
    return ok(undefined);
  }

  onError(message: string): Err<void, string> {
    console.log(message);
    this.onDestinationPrepared();
    return err(`Destination initialization failed. ${message}`);
  }

  canUseDestination(profileResult: DbtProfileSuccess, ubuntuInWslWorks: boolean): boolean {
    return (
      DestinationContext.ZETASQL_SUPPORTED_PLATFORMS.includes(process.platform) &&
      (profileResult.type?.toLowerCase().trim() === 'bigquery' ||
        (profileResult.type?.toLowerCase().trim() === 'snowflake' && process.env['DBT_LS_ENABLE_DEBUG_LOGS'] === 'true')) && // TODO: change this condition when snowflake is supported
      ubuntuInWslWorks
    );
  }

  async analyzeModelTree(node: DagNode, sql: string): Promise<ModelsAnalyzeResult[]> {
    if (!this.projectAnalyzer) {
      throw new Error(DestinationContext.NOT_INITIALIZED_ERROR);
    }
    return this.projectAnalyzer.analyzeModelTree(node, sql);
  }

  async analyzeSql(sql: string): Promise<AnalyzeResult> {
    if (!this.projectAnalyzer) {
      throw new Error(DestinationContext.NOT_INITIALIZED_ERROR);
    }
    return this.projectAnalyzer.analyzeSql(sql);
  }

  async analyzeProject(analyzeTracker: AnalyzeTrackerFunc): Promise<ModelsAnalyzeResult[]> {
    if (!this.projectAnalyzer) {
      throw new Error(DestinationContext.NOT_INITIALIZED_ERROR);
    }
    return this.projectAnalyzer.analyzeProject(analyzeTracker);
  }

  dispose(): void {
    this.projectAnalyzer?.dispose();
  }
}
