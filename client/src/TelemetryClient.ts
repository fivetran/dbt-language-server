import TelemetryReporter, { TelemetryEventProperties } from '@vscode/extension-telemetry';
import { ExtensionContext } from 'vscode';
import { PackageJson } from './ExtensionClient';
import { log } from './Logger';

export class TelemetryClient {
  private static client: TelemetryReporter | undefined;

  static sendEvent(eventName: string, properties?: TelemetryEventProperties): void {
    TelemetryClient.client?.sendTelemetryEvent(eventName, properties);
  }

  static sendError(properties?: TelemetryEventProperties): void {
    TelemetryClient.client?.sendTelemetryErrorEvent('error', properties);
  }

  static activate(context: ExtensionContext, packageJson?: PackageJson): void {
    if (process.env['DBT_LS_DISABLE_TELEMETRY']) {
      log('Telemetry is disabled');
      return;
    }

    if (packageJson) {
      TelemetryClient.client = new TelemetryReporter(packageJson.aiKey);
      context.subscriptions.push(TelemetryClient.client);
    } else {
      log('Telemetry was not activated');
    }
  }
}
