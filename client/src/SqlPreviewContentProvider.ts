import { Event, EventEmitter, TextDocumentContentProvider, Uri } from 'vscode';

export default class SqlPreviewContentProvider implements TextDocumentContentProvider {
  static readonly SCHEME = 'query-preview';
  static readonly URI = Uri.parse(`${SqlPreviewContentProvider.SCHEME}:Preview?dbt-language-server`);

  texts = new Map<string, string>();

  activeDocUri: Uri = Uri.parse('');

  private onDidChangeEmitter = new EventEmitter<Uri>();

  update(uri: string, text: string): void {
    this.texts.set(uri, text);
    this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
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
    return this.texts.get(this.activeDocUri.toString()) ?? '';
  }
}
