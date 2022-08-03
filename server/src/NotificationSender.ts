import { DebugEvent, TelemetryEvent } from 'dbt-language-server-common';
import { Diagnostic, TelemetryEventNotification, _Connection } from 'vscode-languageserver';

export class NotificationSender {
  constructor(private connection: _Connection) {}

  logLanguageServerEvent(event: DebugEvent): void {
    this.connection
      .sendNotification('custom/languageServerEventNotification', event)
      .catch(e => console.log(`Failed to send language server event notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendTelemetry(name: string, properties?: { [key: string]: string }): void {
    console.log(JSON.stringify(properties));
    this.connection
      .sendNotification<TelemetryEvent>(TelemetryEventNotification.type, { name, properties })
      .catch(e => console.log(`Failed to send notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendUpdateQueryPreview(uri: string, previewText: string): void {
    this.connection
      .sendNotification('custom/updateQueryPreview', { uri, previewText })
      .catch(e => console.log(`Failed to send notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendDiagnostics(uri: string, rawDiagnostics: Diagnostic[], compiledDiagnostics: Diagnostic[]): void {
    this.connection
      .sendDiagnostics({ uri, diagnostics: rawDiagnostics })
      .catch(e => console.log(`Failed to send diagnostics: ${e instanceof Error ? e.message : String(e)}`));
    this.connection
      .sendNotification('custom/updateQueryPreviewDiagnostics', { uri, diagnostics: compiledDiagnostics })
      .catch(e => console.log(`Failed to send notification: ${e instanceof Error ? e.message : String(e)}`));
  }
}
