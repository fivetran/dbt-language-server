import { Diagnostic, DiagnosticCollection, DiagnosticSeverity, Event, EventEmitter, TextDocumentContentProvider, Uri } from 'vscode';

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

  update(uri: string, previewText: string, diagnostics: Diagnostic[]): void {
    // We need to set Error severity on client since vscode-languageserver.DiagnosticSeverity.Error !== vscode.DiagnosticSeverity.Error
    diagnostics.forEach(d => (d.severity = DiagnosticSeverity.Error));

    this.previewInfos.set(uri, { previewText, diagnostics });
    this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
  }

  updatePreviewDiagnostics(diagnostics?: DiagnosticCollection): void {
    const previewDiagnostics = this.previewInfos.get(this.activeDocUri.toString())?.diagnostics ?? [];
    diagnostics?.set(SqlPreviewContentProvider.URI, previewDiagnostics);
  }

  changeActiveDocument(uri: Uri): void {
    this.activeDocUri = uri;
    this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }

  get onDidChange(): Event<Uri> {
    return this.onDidChangeEmitter.event;
  }

  provideTextDocumentContent(): string {
    return this.previewInfos.get(this.activeDocUri.toString())?.previewText ?? '';
  }
}
