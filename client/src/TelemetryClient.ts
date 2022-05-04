import TelemetryReporter, { TelemetryEventProperties } from '@vscode/extension-telemetry';
import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from 'vscode';

export class TelemetryClient {
  private static client: TelemetryReporter | undefined;

  static sendEvent(eventName: string, properties?: TelemetryEventProperties): void {
    TelemetryClient.client?.sendTelemetryEvent(eventName, properties);
  }

  static sendException(error: Error, properties?: TelemetryEventProperties): void {
    TelemetryClient.client?.sendTelemetryException(error, properties);
  }

  static sendError(properties?: TelemetryEventProperties): void {
    TelemetryClient.client?.sendTelemetryErrorEvent('error', properties);
  }

  static activate(context: ExtensionContext): void {
    if (process.env['DBT_LS_DISABLE_TELEMETRY']) {
      console.log('Telemetry is disabled');
      return;
    }

    const extensionPath = path.join(context.extensionPath, 'package.json');
    const { name, version, aiKey } = JSON.parse(fs.readFileSync(extensionPath, 'utf8')) as { name: string; version: string; aiKey: string };

    // const packageJson = extensions.getExtension('dbt-language-server').packageJSON;
    if (name && version && aiKey) {
      TelemetryClient.client = new TelemetryReporter(name, version, aiKey);
      context.subscriptions.push(TelemetryClient.client);
    } else {
      console.log('Telemetry was not activated');
    }
  }
}
