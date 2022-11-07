import { NO_PROJECT_PATH, StatusNotification } from 'dbt-language-server-common';
import { FeatureFinder } from '../FeatureFinder';
import { NotificationSender } from '../NotificationSender';

export class NoProjectStatusSender {
  constructor(protected notificationSender: NotificationSender, protected featureFinder: FeatureFinder) {}

  getProjectPath(): string {
    return NO_PROJECT_PATH;
  }

  sendStatus(): void {
    const statusNotification: StatusNotification = {
      projectPath: this.getProjectPath(),
      pythonStatus: {
        path: this.featureFinder.getPythonPath(),
      },
      dbtStatus: {
        versionInfo: this.featureFinder.versionInfo,
      },
    };

    this.notificationSender.sendStatus(statusNotification);
  }
}
