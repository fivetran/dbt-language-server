import { StatusNotification } from 'dbt-language-server-common';
import { FileChangeType } from 'vscode-languageserver';
import { FileChangeListener } from '../FileChangeListener';
import { NotificationSender } from '../NotificationSender';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { NoProjectStatusSender } from './NoProjectStatusSender';

export class DbtProjectStatusSender extends NoProjectStatusSender {
  constructor(
    notificationSender: NotificationSender,
    private projectPath: string,
    featureFinder: FeatureFinder,
    private fileChangeListener: FileChangeListener,
  ) {
    super(notificationSender, featureFinder);
    this.fileChangeListener.onDbtPackagesYmlChanged(e => this.onDbtPackagesYmlChanged(e));
    featureFinder.packagesYmlExistsPromise
      .then(packagesYmlFound => this.sendYmlStatus(packagesYmlFound, featureFinder.getProfilesYmlPath()))
      .catch(e => console.log(`Error while finding packages.yml: ${e instanceof Error ? e.message : String(e)}`));
  }

  override getProjectPath(): string {
    return this.projectPath;
  }

  sendYmlStatus(packagesYmlFound: boolean, profilesYmlPath?: string): void {
    const statusNotification: StatusNotification = {
      projectPath: this.projectPath,
      packagesStatus: { packagesYmlFound },
    };
    if (profilesYmlPath) {
      statusNotification.profilesYmlStatus = { profilesYmlPath };
    }

    this.notificationSender.sendStatus(statusNotification);
  }

  onDbtPackagesYmlChanged(e: FileChangeType): void {
    switch (e) {
      case FileChangeType.Created: {
        this.sendYmlStatus(true);
        break;
      }
      case FileChangeType.Deleted: {
        this.sendYmlStatus(false);
        break;
      }
      default:
      // do nothing
    }
  }
}
