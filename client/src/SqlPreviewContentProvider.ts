import {
  Diagnostic,
  DiagnosticRelatedInformation,
  DiagnosticSeverity,
  Event,
  EventEmitter,
  Location,
  Range,
  TextDocumentContentProvider,
  Uri,
} from 'vscode';
import { log } from './Logger';

interface PreviewInfo {
  previewText: string;
  diagnostics: Diagnostic[];
}

export default class SqlPreviewContentProvider implements TextDocumentContentProvider {
  static readonly SCHEME = 'query-preview';
  static readonly URI = Uri.parse(`${SqlPreviewContentProvider.SCHEME}:Preview?dbt-language-server`);

  previewInfos = new Map<string, PreviewInfo>();

  activeDocUri: Uri = Uri.parse('');

  private onDidChangeEmitter = new EventEmitter<Uri>();

  static isPreviewDocument(uri: Uri): boolean {
    return uri.path === SqlPreviewContentProvider.URI.path;
  }

  updateText(uri: string, previewText: string): void {
    const currentValue = this.previewInfos.get(uri);
    if (process.env['DBT_LS_DISABLE_TELEMETRY'] === 'true') {
      // TODO: remove
      log(`updateText: ${uri}: ${previewText}`);
    }

    this.previewInfos.set(uri, {
      previewText,
      diagnostics: currentValue?.diagnostics ?? [],
    });

    if (uri.toString() === this.activeDocUri.toString()) {
      this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
    }
  }

  updateDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
    // We need to recreate Diagnostic due to its client and server inconsistency
    diagnostics.forEach(d => {
      d.severity = DiagnosticSeverity.Error;
    });
    const currentValue = this.previewInfos.get(uri);
    if (process.env['DBT_LS_DISABLE_TELEMETRY'] === 'true') {
      // TODO: remove
      log(`updateDiagnostics: ${uri}: ${currentValue?.previewText ?? ''}`);
    }
    this.previewInfos.set(uri, {
      previewText: currentValue?.previewText ?? '',
      diagnostics: diagnostics.map<Diagnostic>(d => {
        const diag = new Diagnostic(d.range, d.message, DiagnosticSeverity.Error);
        if (d.relatedInformation && d.relatedInformation.length > 0) {
          const newUri = Uri.parse(d.relatedInformation[0].location.uri.toString());
          const rangeFromServer = d.relatedInformation[0].location.range;
          const range = new Range(
            rangeFromServer.start.line,
            rangeFromServer.start.character,
            rangeFromServer.end.line,
            rangeFromServer.end.character,
          );
          const location = new Location(newUri, range);
          diag.relatedInformation = [new DiagnosticRelatedInformation(location, d.relatedInformation[0].message)];
        } else {
          diag.relatedInformation = [];
        }

        return diag;
      }),
    });
    this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
  }

  getPreviewDiagnostics(): Diagnostic[] {
    return this.previewInfos.get(this.activeDocUri.toString())?.diagnostics ?? [];
  }

  changeActiveDocument(uri: Uri): void {
    if (uri.toString() !== this.activeDocUri.toString()) {
      this.activeDocUri = uri;
      this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
    }
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }

  get onDidChange(): Event<Uri> {
    return this.onDidChangeEmitter.event;
  }

  provideTextDocumentContent(): string {
    if (process.env['DBT_LS_DISABLE_TELEMETRY'] === 'true') {
      // TODO: remove
      log(`provideTextDocumentContent: ${this.activeDocUri.toString()}`);
    }
    return this.previewInfos.get(this.activeDocUri.toString())?.previewText ?? '';
  }
}
