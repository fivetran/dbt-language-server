import { Event, EventEmitter, TextDocumentContentProvider, Uri } from 'vscode';

export default class SqlPreviewContentProvider implements TextDocumentContentProvider {
  static scheme = 'query-preview';
  static uri = Uri.parse(`${SqlPreviewContentProvider.scheme}:Preview?dbt-language-server`);
  texts = new Map<string, string>();

  activeDocUri: Uri = Uri.parse('');

  private onDidChangeEmitter = new EventEmitter<Uri>();

  update(uri: string, text: string): void {
    this.texts.set(uri, text);
    this.onDidChangeEmitter.fire(SqlPreviewContentProvider.uri);
  }

  changeActiveDocument(uri: Uri): void {
    this.activeDocUri = uri;
    this.onDidChangeEmitter.fire(SqlPreviewContentProvider.uri);
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }

  get onDidChange(): Event<Uri> {
    return this.onDidChangeEmitter.event;
  }

  provideTextDocumentContent(): string {
    const text = this.activeDocUri ? this.texts.get(this.activeDocUri.toString()) : '';
    return text ?? '';
  }
}
