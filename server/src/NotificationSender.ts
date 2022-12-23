import { StatusNotification, TelemetryEvent } from 'dbt-language-server-common';
import { Diagnostic, PublishDiagnosticsParams, TelemetryEventNotification, _Connection } from 'vscode-languageserver';

export class NotificationSender {
  constructor(private connection: _Connection) {}

  sendDiagnostics(uri: string, rawDiagnostics: Diagnostic[], compiledDiagnostics: Diagnostic[]): void {
    this.sendRawDiagnostics({ uri, diagnostics: rawDiagnostics });
    this.sendNotification('custom/updateQueryPreviewDiagnostics', { uri, diagnostics: compiledDiagnostics });
  }

  clearDiagnostics(uri: string): void {
    this.sendRawDiagnostics({ uri, diagnostics: [] });
  }

  sendRawDiagnostics(params: PublishDiagnosticsParams): void {
    this.connection.sendDiagnostics(params).catch(e => console.log(`Failed to send diagnostics: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendLanguageServerManifestParsed(): void {
    this.sendNotification('custom/manifestParsed');
  }

  sendTelemetry(name: string, properties?: { [key: string]: string }): void {
    console.log(JSON.stringify(properties));
    this.connection
      .sendNotification<TelemetryEvent>(TelemetryEventNotification.type, { name, properties })
      .catch(e => console.log(`Failed to send notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendUpdateQueryPreview(uri: string, previewText: string): void {
    this.sendNotification('custom/updateQueryPreview', { uri, previewText });
  }

  sendStatus(statusNotification: StatusNotification): void {
    this.sendNotification('WizardForDbtCore(TM)/status', statusNotification);
  }

  sendRestart(): void {
    this.sendNotification('WizardForDbtCore(TM)/restart');
  }

  sendInstallDbtAdapterLog(data: string): void {
    this.sendNotification('WizardForDbtCore(TM)/installDbtAdapterLog', data);
  }

  sendInstallLatestDbtLog(data: string): void {
    this.sendNotification('WizardForDbtCore(TM)/installLatestDbtLog', data);
  }

  private sendNotification(method: string, params?: unknown): void {
    this.connection
      .sendNotification(method, params)
      .catch(e => console.log(`Failed to send ${method} notification: ${e instanceof Error ? e.message : String(e)}`));
  }
}
