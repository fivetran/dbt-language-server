import { ProgressLocation, window } from 'vscode';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from 'vscode-languageserver-protocol';
import { deferred, DeferredResult } from './Utils';

export class ProgressHandler {
  progressDeferred?: DeferredResult<void>;

  async onProgress(value: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): Promise<void> {
    switch (value.kind) {
      case 'begin':
        await this.begin();
        break;
      case 'end':
        this.progressDeferred?.resolve();
        this.progressDeferred = undefined;
        break;
      default:
        console.log('Received event that is not supported');
        break;
    }
  }

  async begin(): Promise<void> {
    if (!this.progressDeferred) {
      this.progressDeferred = deferred<void>();

      void window.withProgress(
        {
          location: ProgressLocation.Window,
          title: 'dbt command execution...',
          cancellable: false,
        },
        () => this.progressDeferred?.promise ?? Promise.resolve(),
      );
    }
  }
}
