import * as fs from 'fs';
import * as path from 'path';
import { ExtensionContext } from 'vscode';
import TelemetryReporter from 'vscode-extension-telemetry';

export class TelemetryClient {
  private static client: TelemetryReporter;

  static sendEvent(eventName: string, properties?: { [key: string]: string }): void {
    if (TelemetryClient.client) {
      TelemetryClient.client.sendTelemetryEvent(eventName, properties);
    }
  }

  static sendException(error: Error, properties?: { [key: string]: string }) {
    if (TelemetryClient.client) {
      TelemetryClient.client.sendTelemetryException(error, properties);
    }
  }

  static activate(context: ExtensionContext): TelemetryReporter {
    if (process.env['DBT_LS_DISABLE_TELEMETRY']) {
      return null;
    }

    var extensionPath = path.join(context.extensionPath, 'package.json');
    var packageJson = JSON.parse(fs.readFileSync(extensionPath, 'utf8'));

    // const packageJson = extensions.getExtension('dbt-language-server').packageJSON;
    if (packageJson.name && packageJson.version && packageJson.aiKey) {
      TelemetryClient.client = new TelemetryReporter(packageJson.name, packageJson.version, packageJson.aiKey);
    } else {
      console.log('Telemetry was not activated');
    }
    return TelemetryClient.client;
  }
}
