import { RefReplacement } from 'dbt-language-server-common';
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
  commands,
  languages,
  window,
} from 'vscode';
import { SQL_LANG_ID } from './Utils';

interface PreviewInfo {
  previewText: string;
  refReplacements: RefReplacement[];
  diagnostics: Diagnostic[];
  langId: string;
}

export default class SqlPreviewContentProvider implements TextDocumentContentProvider {
  static readonly SCHEME = 'query-preview';
  static readonly URI = Uri.parse(`${SqlPreviewContentProvider.SCHEME}:Preview?dbt-language-server`);

  private useConfigForRefs = false;

  changeMode(useConfigForRefs: boolean): void {
    this.setUseConfigForRefs(useConfigForRefs);
    this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
  }

  setUseConfigForRefs(useConfigForRefs: boolean): void {
    if (this.useConfigForRefs !== useConfigForRefs) {
      commands
        .executeCommand('setContext', 'WizardForDbtCore:useConfigForRefs', useConfigForRefs)
        .then(undefined, e => console.log(e instanceof Error ? e.message : String(e)));
      this.useConfigForRefs = useConfigForRefs;
    }
  }

  previewInfos = new Map<string, PreviewInfo>();

  activeDocUri: Uri = Uri.parse('');

  private onDidChangeEmitter = new EventEmitter<Uri>();
  private onDidChangeDiagnosticsEmitter = new EventEmitter<Uri>();

  static isPreviewDocument(uri: Uri): boolean {
    return uri.path === SqlPreviewContentProvider.URI.path;
  }

  updateText(uri: string, previewText: string, refReplacements: RefReplacement[], langId: string): void {
    const currentValue = this.previewInfos.get(uri);

    this.previewInfos.set(uri, {
      previewText,
      refReplacements,
      diagnostics: currentValue?.diagnostics ?? [],
      langId,
    });

    if (uri.toString() === this.activeDocUri.toString()) {
      this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
    }
  }

  async updateLangId(langId: string): Promise<void> {
    const document = window.visibleTextEditors.find(e => e.document.uri.toString() === SqlPreviewContentProvider.URI.toString())?.document;
    if (document && document.languageId !== langId) {
      await languages.setTextDocumentLanguage(document, langId);
    }
  }

  updateDiagnostics(uri: string, diagnostics: Diagnostic[]): void {
    // We need to recreate Diagnostic due to its client and server inconsistency
    diagnostics.forEach(d => {
      d.severity = DiagnosticSeverity.Error;
    });
    const currentValue = this.previewInfos.get(uri);
    const newValue = diagnostics.map<Diagnostic>(d => {
      const diag = new Diagnostic(d.range, d.message, DiagnosticSeverity.Error);
      if (d.relatedInformation && d.relatedInformation.length > 0) {
        const newUri = Uri.parse(d.relatedInformation[0].location.uri.toString());
        const rangeFromServer = d.relatedInformation[0].location.range;
        const range = new Range(rangeFromServer.start.line, rangeFromServer.start.character, rangeFromServer.end.line, rangeFromServer.end.character);
        const location = new Location(newUri, range);
        diag.relatedInformation = [new DiagnosticRelatedInformation(location, d.relatedInformation[0].message)];
      } else {
        diag.relatedInformation = [];
      }

      return diag;
    });

    this.previewInfos.set(uri, {
      previewText: currentValue?.previewText ?? '',
      refReplacements: currentValue?.refReplacements ?? [],
      diagnostics: newValue,
      langId: currentValue?.langId ?? SQL_LANG_ID,
    });

    if (
      uri.toString() === this.activeDocUri.toString() &&
      currentValue &&
      SqlPreviewContentProvider.diagnosticsAreEqual(currentValue.diagnostics, newValue)
    ) {
      this.onDidChangeDiagnosticsEmitter.fire(SqlPreviewContentProvider.URI);
    }
  }

  getPreviewDiagnostics(): Diagnostic[] {
    const result = this.previewInfos.get(this.activeDocUri.toString())?.diagnostics ?? [];
    console.log(`getPreviewDiagnostics for uri: ${this.activeDocUri.toString()}, result: ${result.length}`);
    return result;
  }

  changeActiveDocument(uri: Uri): void {
    if (uri.toString() !== this.activeDocUri.toString()) {
      this.activeDocUri = uri;
      this.setUseConfigForRefs(false);
      this.onDidChangeEmitter.fire(SqlPreviewContentProvider.URI);
    }
  }

  dispose(): void {
    this.onDidChangeEmitter.dispose();
  }

  get onDidChange(): Event<Uri> {
    return this.onDidChangeEmitter.event;
  }

  get onDidChangeDiagnostics(): Event<Uri> {
    return this.onDidChangeDiagnosticsEmitter.event;
  }

  async provideTextDocumentContent(): Promise<string> {
    const previewInfo = this.previewInfos.get(this.activeDocUri.toString());
    await this.updateLangId(previewInfo?.langId ?? SQL_LANG_ID);

    let text = previewInfo?.previewText ?? '';
    if (this.useConfigForRefs) {
      for (const replacement of previewInfo?.refReplacements ?? []) {
        text = text.replaceAll(replacement.from, replacement.to);
      }
    }
    return text;
  }

  private static diagnosticsAreEqual(d1: Diagnostic[], d2: Diagnostic[]): boolean {
    if (d1.length !== d2.length) {
      return false;
    }

    for (const [i, diag1] of d1.entries()) {
      const diag2 = d2[i];
      if (
        diag1.message !== diag2.message ||
        diag1.range.start.line !== diag2.range.start.line ||
        diag1.range.start.character !== diag2.range.start.character ||
        diag1.range.end.line !== diag2.range.end.line ||
        diag1.range.end.character !== diag2.range.end.character ||
        diag1.severity !== diag2.severity ||
        diag1.relatedInformation?.length !== diag2.relatedInformation?.length
      ) {
        return false;
      }
    }

    return true;
  }
}
