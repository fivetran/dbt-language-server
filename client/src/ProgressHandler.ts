import { ProgressLocation, window } from 'vscode';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from 'vscode-languageserver-protocol';
import { deferred } from './utils';

export class ProgressHandler {
  progressDeferred? = deferred<void>();

  async onProgress(value: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): Promise<void> {
    switch (value.kind) {
      case 'begin':
        await this.begin();
        break;
      case 'end':
        this.progressDeferred?.resolve();
        this.progressDeferred = undefined;
        break;
    }
  }

  async begin(): Promise<void> {
    if (!this.progressDeferred) {
      this.progressDeferred = deferred<void>();

      await window.withProgress(
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
