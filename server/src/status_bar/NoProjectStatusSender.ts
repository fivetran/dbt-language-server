import { NO_PROJECT_PATH, StatusNotification } from 'dbt-language-server-common';
import { NotificationSender } from '../NotificationSender';
import { FeatureFinderBase } from '../feature_finder/FeatureFinderBase';

export class NoProjectStatusSender {
  constructor(protected notificationSender: NotificationSender, protected featureFinder: FeatureFinderBase) {}

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
