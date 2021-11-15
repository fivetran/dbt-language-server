import { ProgressLocation, window } from 'vscode';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from 'vscode-languageserver-protocol';
import { deferred } from './utils';

export class ProgressHandler {
  progressDeferred? = deferred<void>();

  onProgress(value: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): void {
    switch (value.kind) {
      case 'begin':
        this.begin();
        break;
      case 'end':
        this.progressDeferred?.resolve();
        this.progressDeferred = undefined;
        break;
    }
  }

  begin(): void {
    if (!this.progressDeferred) {
      this.progressDeferred = deferred<void>();

      window.withProgress(
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
