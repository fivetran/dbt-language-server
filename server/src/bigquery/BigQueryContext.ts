import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Err, err, Ok, ok, Result } from 'neverthrow';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtProfileCreator } from '../DbtProfileCreator';
import { DestinationDefinition } from '../DestinationDefinition';
import { SchemaTracker } from '../SchemaTracker';
import { YamlParser } from '../YamlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import { BigQueryClient } from './BigQueryClient';

export interface ContextInfo {
  type?: string;
  method?: string;
}

export interface ErrorContextInfo extends ContextInfo {
  error: string;
}

export class BigQueryContext {
  private constructor(
    public contextInfo: ContextInfo,
    public schemaTracker: SchemaTracker,
    public destinationDefinition: DestinationDefinition,
    public zetaSqlWrapper: ZetaSqlWrapper,
  ) {}

  public static async createContext(yamlParser: YamlParser): Promise<Result<BigQueryContext, ErrorContextInfo>> {
    let profileResult = undefined;
    const dbtProfileCreator = new DbtProfileCreator(yamlParser);

    try {
      profileResult = dbtProfileCreator.createDbtProfile();
      if (profileResult.isErr()) {
        return BigQueryContext.createErrorContextInfo(profileResult.error.message, profileResult.error.type, profileResult.error.method);
      }

      const clientResult = await profileResult.value.dbtProfile.createClient(profileResult.value.targetConfig);
      if (clientResult.isErr()) {
        return BigQueryContext.createErrorContextInfo(clientResult.error, profileResult.value.type, profileResult.value.method);
      }

      const bigQueryClient = clientResult.value as BigQueryClient;
      const destinationDefinition = new DestinationDefinition(bigQueryClient);

      const zetaSqlWrapper = new ZetaSqlWrapper();
      await zetaSqlWrapper.initializeZetaSql();

      return BigQueryContext.createContextInfo(
        bigQueryClient,
        destinationDefinition,
        zetaSqlWrapper,
        profileResult.value.type,
        profileResult.value.method,
      );
    } catch (e) {
      let type = undefined;
      let method = undefined;

      if (profileResult) {
        type = profileResult.isOk() ? profileResult.value.type : profileResult.error.type;
        method = profileResult.isOk() ? profileResult.value.method : profileResult.error.method;
      }

      return BigQueryContext.createErrorContextInfo('Data Warehouse initialization failed.', type, method);
    }
  }

  private static createErrorContextInfo(error: string, type?: string, method?: string): Err<never, ErrorContextInfo> {
    return err({
      error,
      type,
      method,
    });
  }

  private static createContextInfo(
    bigQueryClient: BigQueryClient,
    destinationDefinition: DestinationDefinition,
    zetaSqlWrapper: ZetaSqlWrapper,
    type?: string,
    method?: string,
  ): Ok<BigQueryContext, never> {
    const schemaTracker = new SchemaTracker(bigQueryClient, zetaSqlWrapper);
    return ok(new BigQueryContext({ type, method }, schemaTracker, destinationDefinition, zetaSqlWrapper));
  }

  async getAstOrError(compiledDocument: TextDocument): Promise<Result<AnalyzeResponse__Output, string>> {
    try {
      const ast = await this.zetaSqlWrapper.analyze(compiledDocument.getText());
      console.log('AST was successfully received');
      return ok(ast);
    } catch (e: any) {
      console.log('There was an error wile parsing SQL query');
      return err(e.details ?? 'Unknown parser error [at 0:0]');
    }
  }

  async ensureCatalogInitialized(compiledDocument: TextDocument): Promise<void> {
    await this.schemaTracker.refreshTableNames(compiledDocument.getText());
    if (this.schemaTracker.hasNewTables || !this.zetaSqlWrapper.isCatalogRegistered()) {
      await this.registerCatalog();
    }
  }

  async registerCatalog(): Promise<void> {
    await this.zetaSqlWrapper.registerCatalog(this.schemaTracker.tableDefinitions);
    this.schemaTracker.resetHasNewTables();
  }

  public dispose(): void {
    void this.zetaSqlWrapper.terminateServer();
  }
}
