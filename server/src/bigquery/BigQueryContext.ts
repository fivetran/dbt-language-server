import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { err, ok, Result } from 'neverthrow';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DestinationDefinition } from '../DestinationDefinition';
import { SchemaTracker } from '../SchemaTracker';
import { ZetaSqlWrapper } from '../ZetaSqlWrapper';
import { BigQueryClient } from './BigQueryClient';

interface PresentBigQueryContext {
  schemaTracker: SchemaTracker;
  destinationDefinition: DestinationDefinition;
  zetaSqlWrapper: ZetaSqlWrapper;
}

export class BigQueryContext {
  private static CONTEXT_NOT_INITIALIZED_ERROR = 'Context is not initialized.';

  private constructor(public present: boolean, public presentBigQueryContext?: PresentBigQueryContext) {}

  public static createEmptyContext(): BigQueryContext {
    return new BigQueryContext(false);
  }

  public static createPresentContext(
    bigQueryClient: BigQueryClient,
    destinationDefinition: DestinationDefinition,
    zetaSqlWrapper: ZetaSqlWrapper,
  ): BigQueryContext {
    const schemaTracker = new SchemaTracker(bigQueryClient, zetaSqlWrapper);
    return new BigQueryContext(true, {
      schemaTracker,
      destinationDefinition,
      zetaSqlWrapper,
    });
  }

  isPresent(): boolean {
    return this.present;
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
}
