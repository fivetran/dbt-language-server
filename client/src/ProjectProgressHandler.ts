import { Progress, ProgressLocation, window } from 'vscode';
import { WorkDoneProgressBegin, WorkDoneProgressEnd, WorkDoneProgressReport } from 'vscode-languageserver-protocol';
import { log } from './Logger';

export class ProjectProgressHandler {
  progress?: Progress<{ message?: string; increment?: number }>;
  progressResolver?: () => void;

  onProgress(value: WorkDoneProgressBegin | WorkDoneProgressReport | WorkDoneProgressEnd): void {
    switch (value.kind) {
      case 'begin': {
        if (!this.progress) {
          window
            .withProgress(
              {
                location: ProgressLocation.Window,
                title: value.title,
              },
              (progress: Progress<{ message?: string; increment?: number }>) => {
                this.progress = progress;
                return new Promise<void>(resolve => {
                  this.progressResolver = resolve;
                });
              },
            )
            .then(undefined, e => log(e instanceof Error ? e.message : String(e)));
        }
        break;
      }
      case 'report': {
        this.progress?.report({ increment: value.percentage, message: value.message });
        break;
      }
      case 'end': {
        if (this.progressResolver) {
          this.progressResolver();
        }
        this.progress = undefined;
        break;
      }
      default: {
        log('ProjectProgressHandler received event that is not supported');
        break;
      }
    }
  }
}
