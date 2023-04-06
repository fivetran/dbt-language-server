import { StatusNotification } from 'dbt-language-server-common';
import { FileChangeType } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { FileChangeListener } from '../FileChangeListener';
import { NotificationSender } from '../NotificationSender';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { NoProjectStatusSender } from './NoProjectStatusSender';

export class DbtProjectStatusSender extends NoProjectStatusSender {
  constructor(
    notificationSender: NotificationSender,
    private dbtRepository: DbtRepository,
    featureFinder: FeatureFinder,
    private fileChangeListener: FileChangeListener,
    profileName: string,
  ) {
    super(notificationSender, featureFinder);
    this.fileChangeListener.onDbtPackagesYmlChanged(e => this.onDbtPackagesYmlChanged(e));
    featureFinder.packagesYmlExistsPromise
      .then(packagesYmlFound => this.sendYmlStatus(packagesYmlFound, profileName, featureFinder.getProfilesYmlPath()))
      .catch(e => console.log(`Error while finding packages.yml: ${e instanceof Error ? e.message : String(e)}`));
  }

  override getProjectPath(): string {
    return this.dbtRepository.projectPath;
  }

  sendYmlStatus(packagesYmlFound: boolean, activeProfileName?: string, profilesYmlPath?: string): void {
    const statusNotification: StatusNotification = {
      projectPath: this.dbtRepository.projectPath,
      packagesStatus: { packagesYmlFound },
    };
    if (activeProfileName && profilesYmlPath) {
      statusNotification.profilesYmlStatus = { activeProfileName, profilesYmlPath };
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
