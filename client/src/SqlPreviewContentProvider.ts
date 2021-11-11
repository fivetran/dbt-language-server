import * as vscode from 'vscode';

export default class SqlPreviewContentProvider implements vscode.TextDocumentContentProvider {
  static scheme = 'query-preview';
  static uri = vscode.Uri.parse(SqlPreviewContentProvider.scheme + ':Preview?dbt-language-server');
  texts = new Map<string, string>();

  activeDocUri = '';

  private _onDidChange = new vscode.EventEmitter<vscode.Uri>();

  update(uri: string, text: string): void {
    this.texts.set(uri, text);
    this._onDidChange.fire(SqlPreviewContentProvider.uri);
  }

  changeActiveDocument(uri: string): void {
    this.activeDocUri = uri;
    this._onDidChange.fire(SqlPreviewContentProvider.uri);
  }

  dispose(): void {
    this._onDidChange.dispose();
  }

  get onDidChange(): vscode.Event<vscode.Uri> {
    return this._onDidChange.event;
  }

  provideTextDocumentContent(): string {
    return this.texts.get(this.activeDocUri) ?? '';
  }
}
