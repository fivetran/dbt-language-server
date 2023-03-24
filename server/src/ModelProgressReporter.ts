import { WorkDoneProgress, _Connection } from 'vscode-languageserver';

export class ModelProgressReporter {
  static uris = new Set<string>();
  static token = 'Progress';

  constructor(private connection: _Connection) {}

  sendStart(uri?: string): void {
    if (uri) {
      ModelProgressReporter.uris.add(uri);
    }
    this.connection
      .sendProgress(WorkDoneProgress.type, ModelProgressReporter.token, {
        kind: 'begin',
        title: 'Wizard for dbt Core (TM)',
      })
      .catch(e => console.log(`Failed to send progress: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendFinish(uri?: string): void {
    if (uri) {
      ModelProgressReporter.uris.delete(uri);
    }
    if (ModelProgressReporter.uris.size === 0) {
      this.connection
        .sendProgress(WorkDoneProgress.type, ModelProgressReporter.token, { kind: 'end' })
        .catch(e => console.log(`Failed to send progress: ${e instanceof Error ? e.message : String(e)}`));
    }
  }
}
