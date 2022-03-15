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
      throw new Error('Context is not initialized.');
    }
    return this.presentBigQueryContext as PresentBigQueryContext;
  }
}
