import { StatusNotification } from 'dbt-language-server-common';
import { FileChangeType, _Connection } from 'vscode-languageserver';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';

export class StatusSender {
  constructor(
    private connection: _Connection,
    private projectPath: string,
    private featureFinder: FeatureFinder,
    private fileChangeListener: FileChangeListener,
  ) {
    this.fileChangeListener.onDbtPackagesYmlChanged(e => this.onDbtPackagesYmlChanged(e));
  }

  async sendStatus(): Promise<void> {
    const statusNotification: StatusNotification = {
      projectPath: this.projectPath,
      pythonStatus: {
        path: this.featureFinder.getPythonPath(),
      },
      dbtStatus: {
        versionInfo: this.featureFinder.versionInfo,
      },
      packagesStatus: {
        packagesYmlFound: await this.featureFinder.dbtPackagesPathPromise,
      },
    };

    this.send(statusNotification);
  }

  sendPackagesStatus(packagesYmlFound: boolean): void {
    const statusNotification: StatusNotification = {
      projectPath: this.projectPath,
      packagesStatus: { packagesYmlFound },
    };

    this.send(statusNotification);
  }

  send(statusNotification: StatusNotification): void {
    this.connection
      .sendNotification('dbtWizard/status', statusNotification)
      .catch(e => console.log(`Failed to send status notification: ${e instanceof Error ? e.message : String(e)}`));
  }

  onDbtPackagesYmlChanged(e: FileChangeType): void {
    switch (e) {
      case FileChangeType.Created:
        this.sendPackagesStatus(true);
        return;
      case FileChangeType.Deleted:
        this.sendPackagesStatus(false);
        return;
      default: {
        // do nothing
      }
    }
  }
}
