import { deferred, DeferredResult } from 'dbt-language-server-common';
import { ProgressLocation, window } from 'vscode';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from 'vscode-languageserver-protocol';

export class ProgressHandler {
  progressDeferred?: DeferredResult<void>;

  onProgress(value: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): void {
    switch (value.kind) {
      case 'begin':
        this.begin();
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

  begin(): void {
    if (!this.progressDeferred) {
      this.progressDeferred = deferred<void>();

      window
        .withProgress(
          {
            location: ProgressLocation.Window,
            title: 'dbt command execution...',
            cancellable: false,
          },
          () => this.progressDeferred?.promise ?? Promise.resolve(),
        )
        .then(undefined, e => console.log(e instanceof Error ? e.message : e));
    }
  }
}
