import { WorkDoneProgress, WorkDoneProgressBegin, WorkDoneProgressEnd, _Connection } from 'vscode-languageserver';

export class ProgressReporter {
  static uris = new Set<string>();
  static token = 'dbtCompileProgress';

  connection: _Connection;
  uri: string;

  constructor(connection: _Connection, uri: string) {
    this.connection = connection;
    this.uri = uri;
  }

  async sendCompilationStart(): Promise<void> {
    ProgressReporter.uris.add(this.uri);
    this.connection.sendProgress(WorkDoneProgress.type, ProgressReporter.token, <WorkDoneProgressBegin>{
      kind: 'begin',
      //   message: [...ProgressReporter.uris].join(','), // TODO: pass state for each uri
    });
  }

  sendCompilationFinished(): void {
    ProgressReporter.uris.delete(this.uri);
    if (ProgressReporter.uris.size === 0) {
      this.connection.sendProgress(WorkDoneProgress.type, ProgressReporter.token, <WorkDoneProgressEnd>{ kind: 'end' });
    }
  }
}
