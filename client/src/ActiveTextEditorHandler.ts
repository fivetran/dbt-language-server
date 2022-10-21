import { Disposable, TextEditor, window } from 'vscode';
import { SUPPORTED_LANG_IDS } from './Constants';
import { DbtLanguageClientManager } from './DbtLanguageClientManager';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';

export class ActiveTextEditorHandler {
  handler: Disposable;
  static lastActiveEditor?: TextEditor;

  constructor(
    private previewContentProvider: SqlPreviewContentProvider,
    private dbtLanguageClientManager: DbtLanguageClientManager,
    private statusHandler: StatusHandler,
  ) {
    this.handler = window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this));
    if (this.isValidLanguageId(window.activeTextEditor)) {
      ActiveTextEditorHandler.lastActiveEditor = window.activeTextEditor;
    }
  }

  async onDidChangeActiveTextEditor(activeEditor: TextEditor | undefined): Promise<void> {
    if (
      !activeEditor ||
      SqlPreviewContentProvider.isPreviewDocument(activeEditor.document.uri) ||
      !this.isValidLanguageId(activeEditor) ||
      ActiveTextEditorHandler.lastActiveEditor?.document.uri.path === activeEditor.document.uri.path
    ) {
      return;
    }

    ActiveTextEditorHandler.lastActiveEditor = activeEditor;

    this.previewContentProvider.changeActiveDocument(activeEditor.document.uri);

    const client = await this.dbtLanguageClientManager.getClientByUri(activeEditor.document.uri);

    if (client?.getProjectUri()) {
      this.statusHandler.updateLanguageItems(client.getProjectUri().fsPath);
    }
    client?.resendDiagnostics(activeEditor.document.uri.toString());
  }

  isValidLanguageId(activeEditor: TextEditor | undefined): boolean {
    return activeEditor !== undefined && SUPPORTED_LANG_IDS.includes(activeEditor.document.languageId);
  }

  dispose(): void {
    this.handler.dispose();
  }
}
