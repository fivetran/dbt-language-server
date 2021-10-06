import * as vscode from 'vscode';

export default class SqlPreviewContentProvider implements vscode.TextDocumentContentProvider {
  static scheme = 'query-preview';
  static uri = vscode.Uri.parse(SqlPreviewContentProvider.scheme + ':Preview?dbt-language-server');
  static activeDocUri = '';
  static texts = new Map<string, string>();

  private static _onDidChange = new vscode.EventEmitter<vscode.Uri>();

  static update(uri: string, text: string) {
    SqlPreviewContentProvider.texts.set(uri, text);
    SqlPreviewContentProvider._onDidChange.fire(SqlPreviewContentProvider.uri);
  }

  static changeActiveDocument(uri: string) {
    SqlPreviewContentProvider.activeDocUri = uri;
    SqlPreviewContentProvider._onDidChange.fire(SqlPreviewContentProvider.uri);
  }

  constructor() {}

  dispose() {
    SqlPreviewContentProvider._onDidChange.dispose();
  }

  get onDidChange() {
    return SqlPreviewContentProvider._onDidChange.event;
  }

  provideTextDocumentContent(uri: vscode.Uri): string | Thenable<string> {
    return SqlPreviewContentProvider.texts.get(SqlPreviewContentProvider.activeDocUri) ?? '';
  }
}
