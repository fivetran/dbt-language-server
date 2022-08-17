import { StatusNotification } from 'dbt-language-server-common';
import { FileChangeType } from 'vscode-languageserver';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { NotificationSender } from './NotificationSender';

export class StatusSender {
  constructor(
    private notificationSender: NotificationSender,
    private projectPath: string,
    private featureFinder: FeatureFinder,
    private fileChangeListener: FileChangeListener,
  ) {
    this.fileChangeListener.onDbtPackagesYmlChanged(e => this.onDbtPackagesYmlChanged(e));
    this.featureFinder.packagesYmlExistsPromise
      .then(packagesYmlFound => this.sendPackagesStatus(packagesYmlFound))
      .catch(e => console.log(`Error while finding packages.yml: ${e instanceof Error ? e.message : String(e)}`));
  }

  sendStatus(): void {
    const statusNotification: StatusNotification = {
      projectPath: this.projectPath,
      pythonStatus: {
        path: this.featureFinder.getPythonPath(),
      },
      dbtStatus: {
        versionInfo: this.featureFinder.versionInfo,
      },
    };

    this.notificationSender.sendStatus(statusNotification);
  }

  sendPackagesStatus(packagesYmlFound: boolean): void {
    const statusNotification: StatusNotification = {
      projectPath: this.projectPath,
      packagesStatus: { packagesYmlFound },
    };

    this.notificationSender.sendStatus(statusNotification);
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
