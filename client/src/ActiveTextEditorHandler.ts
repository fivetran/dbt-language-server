import { NO_PROJECT_PATH } from 'dbt-language-server-common';
import { Disposable, TextEditor, window } from 'vscode';
import { DbtLanguageClientManager } from './DbtLanguageClientManager';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';
import { isDocumentSupported } from './Utils';

export class ActiveTextEditorHandler {
  handler: Disposable;
  static lastActiveEditor?: TextEditor;

  constructor(
    private previewContentProvider: SqlPreviewContentProvider,
    private dbtLanguageClientManager: DbtLanguageClientManager,
    private statusHandler: StatusHandler,
  ) {
    this.handler = window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this));
    if (window.activeTextEditor && isDocumentSupported(window.activeTextEditor.document)) {
      ActiveTextEditorHandler.lastActiveEditor = window.activeTextEditor;
    }
  }

  async onDidChangeActiveTextEditor(activeEditor: TextEditor | undefined): Promise<void> {
    if (
      !activeEditor ||
      (activeEditor.document.uri.scheme !== 'file' && activeEditor.document.uri.scheme !== 'untitled') ||
      SqlPreviewContentProvider.isPreviewDocument(activeEditor.document.uri) ||
      ActiveTextEditorHandler.lastActiveEditor?.document.uri.path === activeEditor.document.uri.path
    ) {
      return;
    }

    ActiveTextEditorHandler.lastActiveEditor = activeEditor;

    const client = await this.dbtLanguageClientManager.getClientByUri(activeEditor.document.uri);

    this.statusHandler.updateLanguageItems(client?.getProjectUri().fsPath ?? NO_PROJECT_PATH);

    if (isDocumentSupported(activeEditor.document)) {
      this.previewContentProvider.changeActiveDocument(activeEditor.document.uri);
      client?.resendDiagnostics(activeEditor.document.uri.toString());
    }
  }

  dispose(): void {
    this.handler.dispose();
  }
}
