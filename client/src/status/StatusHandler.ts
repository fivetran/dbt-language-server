import { StatusNotification } from 'dbt-language-server-common';
import { LanguageStatusItems } from './LanguageStatusItems';
import { ProjectStatus } from './ProjectStatus';

export class StatusHandler {
  private projectStatuses: Map<string, ProjectStatus> = new Map();
  private statusItems = new LanguageStatusItems();

  onRestart(projectPath: string): void {
    this.getProjectStatus(projectPath).setBusy();
  }

  updateLanguageItems(projectPath: string): void {
    this.getProjectStatus(projectPath).updateStatusUi();
  }

  onStatusChanged(statusNotification: StatusNotification): void {
    this.getProjectStatus(statusNotification.projectPath).updateStatusData(statusNotification);
    this.updateLanguageItems(statusNotification.projectPath);
  }

  private getProjectStatus(projectPath: string): ProjectStatus {
    let projectStatus = this.projectStatuses.get(projectPath);
    if (projectStatus === undefined) {
      projectStatus = new ProjectStatus(projectPath, this.statusItems);
      this.projectStatuses.set(projectPath, projectStatus);
    }
    return projectStatus;
  }
}
