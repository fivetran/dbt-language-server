import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { err, ok, Result } from 'neverthrow';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtProfileCreator, DbtProfileError, DbtProfileSuccess } from '../DbtProfileCreator';
import { DestinationDefinition } from '../DestinationDefinition';
import { SchemaTracker } from '../SchemaTracker';
import { YamlParser } from '../YamlParser';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import { BigQueryClient } from './BigQueryClient';

interface PresentBigQueryContext {
  schemaTracker: SchemaTracker;
  destinationDefinition: DestinationDefinition;
  zetaSqlWrapper: ZetaSqlWrapper;
}

export class BigQueryContext {
  private static CONTEXT_NOT_INITIALIZED_ERROR = 'Context is not initialized.';

  private dbtProfileCreator: DbtProfileCreator;

  private present?: boolean;
  private presentBigQueryContext?: PresentBigQueryContext;

  public constructor(private yamlParser: YamlParser) {
    this.dbtProfileCreator = new DbtProfileCreator(this.yamlParser);
  }

  public async initialize(): Promise<Result<DbtProfileSuccess, DbtProfileError>> {
    try {
      const profileResult = this.dbtProfileCreator.createDbtProfile();
      if (profileResult.isErr()) {
        this.initializeEmptyContext();
        return err(profileResult.error);
      }

      const clientResult = await profileResult.value.dbtProfile.createClient(profileResult.value.targetConfig);
      if (clientResult.isErr()) {
        this.initializeEmptyContext();
        return err({ message: clientResult.error, type: profileResult.value.type, method: profileResult.value.method });
      }

      const bigQueryClient = clientResult.value as BigQueryClient;
      const destinationDefinition = new DestinationDefinition(bigQueryClient);

      const zetaSqlWrapper = new ZetaSqlWrapper();
      await zetaSqlWrapper.initializeZetaSql();

      this.initializePresentContext(bigQueryClient, destinationDefinition, zetaSqlWrapper);

      return ok(profileResult.value);
    } catch (e) {
      this.initializeEmptyContext();
      return err({ message: 'Data Warehouse initialization failed.' });
    }
  }

  private initializeEmptyContext(): void {
    this.present = false;
  }

  private initializePresentContext(
    bigQueryClient: BigQueryClient,
    destinationDefinition: DestinationDefinition,
    zetaSqlWrapper: ZetaSqlWrapper,
  ): void {
    const schemaTracker = new SchemaTracker(bigQueryClient, zetaSqlWrapper);
    this.presentBigQueryContext = {
      schemaTracker,
      destinationDefinition,
      zetaSqlWrapper,
    };
  }

  isPresent(): boolean {
    return this.present ?? false;
  }

  get(): PresentBigQueryContext {
    if (!this.present) {
      throw new Error(BigQueryContext.CONTEXT_NOT_INITIALIZED_ERROR);
    }
    return this.presentBigQueryContext as PresentBigQueryContext;
  }

  async getAstOrError(compiledDocument: TextDocument): Promise<Result<AnalyzeResponse__Output, string>> {
    try {
      const presentContext = this.get();

      const ast = await presentContext.zetaSqlWrapper.analyze(compiledDocument.getText());
      console.log('AST was successfully received');

      return ok(ast);
    } catch (e: any) {
      console.log('There was an error wile parsing SQL query');
      return err(e.details ?? 'Unknown parser error [at 0:0]');
    }
  }

  async ensureCatalogInitialized(compiledDocument: TextDocument): Promise<void> {
    const presentContext = this.get();
    await presentContext.schemaTracker.refreshTableNames(compiledDocument.getText());
    if (presentContext.schemaTracker.hasNewTables || !presentContext.zetaSqlWrapper.isCatalogRegistered()) {
      await this.registerCatalog();
    }
  }

  async registerCatalog(): Promise<void> {
    const presentContext = this.get();
    await presentContext.zetaSqlWrapper.registerCatalog(presentContext.schemaTracker.tableDefinitions);
    presentContext.schemaTracker.resetHasNewTables();
  }

  public dispose(): void {
    if (this.isPresent()) {
      void this.get().zetaSqlWrapper.terminateServer();
    }
  }
}
