import { err, ok, Result } from 'neverthrow';
import { Emitter, Event } from 'vscode-languageserver';
import { BigQueryContext } from './bigquery/BigQueryContext';
import { DbtProfileSuccess } from './DbtProfileCreator';
import { DbtRepository } from './DbtRepository';

export class DestinationState {
  private static readonly ZETASQL_SUPPORTED_PLATFORMS = ['darwin', 'linux'];

  contextInitialized = false;
  onContextInitializedEmitter = new Emitter<void>();
  bigQueryContext?: BigQueryContext;

  prepareDestinationStub(): Promise<void> {
    this.onDestinationPrepared();
    return Promise.resolve();
  }

  async prepareBigQueryDestination(profileResult: DbtProfileSuccess, dbtRepository: DbtRepository): Promise<Result<void, string>> {
    if (DestinationState.ZETASQL_SUPPORTED_PLATFORMS.includes(process.platform) && profileResult.dbtProfile) {
      const bigQueryContextInfo = await BigQueryContext.createContext(profileResult.dbtProfile, profileResult.targetConfig, dbtRepository);
      if (bigQueryContextInfo.isOk()) {
        this.bigQueryContext = bigQueryContextInfo.value;
      } else {
        this.onDestinationPrepared();
        return err(bigQueryContextInfo.error);
      }
    }

    this.onDestinationPrepared();
    return ok(undefined);
  }

  onDestinationPrepared(): void {
    this.contextInitialized = true;
    this.onContextInitializedEmitter.fire();
  }

  get onContextInitialized(): Event<void> {
    return this.onContextInitializedEmitter.event;
  }

  dispose(): void {
    this.bigQueryContext?.dispose();
  }
}
