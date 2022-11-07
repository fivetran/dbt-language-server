import { NO_PROJECT_PATH, StatusNotification } from 'dbt-language-server-common';
import { LanguageStatusItems } from './LanguageStatusItems';
import { NoProjectStatus } from './NoProjectStatus';
import { ProjectStatus } from './ProjectStatus';

export class StatusHandler {
  private projectStatuses: Map<string, NoProjectStatus> = new Map();
  private statusItems = new LanguageStatusItems();

  onRestart(projectPath: string): void {
    this.getProjectStatus(projectPath).setBusy();
  }

  updateLanguageItems(projectPath: string): void {
    this.getProjectStatus(projectPath).updateStatusUi();
  }

  changeStatus(statusNotification: StatusNotification, forCurrentProject: boolean): void {
    this.getProjectStatus(statusNotification.projectPath).updateStatusData(statusNotification);
    if (forCurrentProject) {
      this.updateLanguageItems(statusNotification.projectPath);
    }
  }

  private getProjectStatus(projectPath: string): NoProjectStatus {
    let projectStatus = this.projectStatuses.get(projectPath);
    if (projectStatus === undefined) {
      projectStatus =
        projectPath === NO_PROJECT_PATH ? new NoProjectStatus(NO_PROJECT_PATH, this.statusItems) : new ProjectStatus(projectPath, this.statusItems);
      this.projectStatuses.set(projectPath, projectStatus);
      projectStatus.updateStatusUi();
    }
    return projectStatus;
  }
}
