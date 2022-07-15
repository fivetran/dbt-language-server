import { WorkDoneProgress, _Connection } from 'vscode-languageserver';

export class ProgressReporter {
  static uris = new Set<string>();
  static token = 'Progress';

  constructor(private connection: _Connection) {}

  sendStart(uri?: string): void {
    if (uri) {
      ProgressReporter.uris.add(uri);
    }
    this.connection
      .sendProgress(WorkDoneProgress.type, ProgressReporter.token, {
        kind: 'begin',
        title: 'dbt Wizard',
      })
      .catch(e => console.log(`Failed to send progress: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendFinish(uri?: string): void {
    if (uri) {
      ProgressReporter.uris.delete(uri);
    }
    if (ProgressReporter.uris.size === 0) {
      this.connection
        .sendProgress(WorkDoneProgress.type, ProgressReporter.token, { kind: 'end' })
        .catch(e => console.log(`Failed to send progress: ${e instanceof Error ? e.message : String(e)}`));
    }
  }
}
