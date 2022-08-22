import { Disposable, TextEditor, window } from 'vscode';
import { DbtLanguageClientManager } from './DbtLanguageClientManager';
import { SUPPORTED_LANG_IDS } from './ExtensionClient';
import SqlPreviewContentProvider from './SqlPreviewContentProvider';
import { StatusHandler } from './status/StatusHandler';

export class ActiveTextEditorHandler {
  handler: Disposable;
  lastActiveEditor?: TextEditor;

  constructor(
    private previewContentProvider: SqlPreviewContentProvider,
    private dbtLanguageClientManager: DbtLanguageClientManager,
    private statusHandler: StatusHandler,
  ) {
    this.handler = window.onDidChangeActiveTextEditor(this.onDidChangeActiveTextEditor.bind(this));
  }

  async onDidChangeActiveTextEditor(activeEditor: TextEditor | undefined): Promise<void> {
    if (
      !activeEditor ||
      activeEditor.document.uri.path === SqlPreviewContentProvider.URI.path ||
      !SUPPORTED_LANG_IDS.includes(activeEditor.document.languageId) ||
      this.lastActiveEditor?.document.uri.path === activeEditor.document.uri.path
    ) {
      return;
    }

    this.lastActiveEditor = activeEditor;

    this.previewContentProvider.changeActiveDocument(activeEditor.document.uri);

    const client = await this.dbtLanguageClientManager.getClientByUri(activeEditor.document.uri);

    if (client?.getProjectUri()) {
      this.statusHandler.updateLanguageItems(client.getProjectUri().fsPath);
    }
    client?.resendDiagnostics(activeEditor.document.uri.toString());
  }

  dispose(): void {
    this.handler.dispose();
  }
}
