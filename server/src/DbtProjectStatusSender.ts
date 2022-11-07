import { StatusNotification } from 'dbt-language-server-common';
import { FileChangeType } from 'vscode-languageserver';
import { FeatureFinder } from './FeatureFinder';
import { FileChangeListener } from './FileChangeListener';
import { NoProjectStatusSender } from './NoProjectStatusSender';
import { NotificationSender } from './NotificationSender';

export class DbtProjectStatusSender extends NoProjectStatusSender {
  constructor(
    notificationSender: NotificationSender,
    private projectPath: string,
    featureFinder: FeatureFinder,
    private fileChangeListener: FileChangeListener,
  ) {
    super(notificationSender, featureFinder);
    this.fileChangeListener.onDbtPackagesYmlChanged(e => this.onDbtPackagesYmlChanged(e));
    this.featureFinder.packagesYmlExistsPromise
      .then(packagesYmlFound => this.sendPackagesStatus(packagesYmlFound))
      .catch(e => console.log(`Error while finding packages.yml: ${e instanceof Error ? e.message : String(e)}`));
  }

  override getProjectPath(): string {
    return this.projectPath;
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
      case FileChangeType.Created: {
        this.sendPackagesStatus(true);
        break;
      }
      case FileChangeType.Deleted: {
        this.sendPackagesStatus(false);
        break;
      }
      default:
      // do nothing
    }
  }
}
