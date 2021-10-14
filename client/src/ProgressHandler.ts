import { ProgressLocation, window } from 'vscode';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from 'vscode-languageserver-protocol';

interface ProgressPromise {
  promise: Promise<unknown>;
  resolve: (value: unknown) => void;
}

export class ProgressHandler {
  progressPromise: ProgressPromise;

  createProgressPromise(): ProgressPromise {
    let promiseResolve;

    const promise = new Promise(function (resolve, reject) {
      promiseResolve = resolve;
    });

    return { promise: promise, resolve: promiseResolve };
  }

  getPromise(): Promise<unknown> {
    return this.progressPromise?.promise;
  }

  onProgress(value: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): void {
    switch (value.kind) {
      case 'begin':
        this.begin();
        break;
      case 'end':
        this.progressPromise?.resolve(0);
        this.progressPromise = null;
        break;
    }
  }

  begin() {
    if (!this.progressPromise) {
      this.progressPromise = this.createProgressPromise();

      window.withProgress(
        {
          location: ProgressLocation.Window,
          title: 'dbt command execution...',
          cancellable: false,
        },
        (progress, token) => {
          return this.progressPromise.promise;
        },
      );
    }
  }
}
