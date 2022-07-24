import { DebugEvent } from 'dbt-language-server-common';
import { _Connection } from 'vscode-languageserver';

export class LspServerEventReporter {
  static logLanguageServerEvent(connection: _Connection, event: DebugEvent): void {
    connection
      .sendNotification('custom/languageServerEventNotification', event)
      .catch(e => console.log(`Failed to send language server event notification: ${e instanceof Error ? e.message : String(e)}`));
  }
}
