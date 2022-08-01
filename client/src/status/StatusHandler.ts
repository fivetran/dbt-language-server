import { StatusNotification } from 'dbt-language-server-common';
import { LanguageStatusItems } from './LanguageStatusItems';
import { ProjectStatus } from './ProjectStatus';

export class StatusHandler {
  private projectStatuses: Map<string, ProjectStatus> = new Map();
  private statusItems?: LanguageStatusItems;

  updateLanguageItems(projectPath: string): void {
    this.getProjectStatus(projectPath).updateStatusUi();
  }

  onStatusChanged(statusNotification: StatusNotification, projectPath?: string): void {
    if (projectPath) {
      this.getProjectStatus(projectPath).updateStatusData(statusNotification);
      this.updateLanguageItems(projectPath);
    }
  }

  private getStatusItems(): LanguageStatusItems {
    if (this.statusItems === undefined) {
      this.statusItems = new LanguageStatusItems();
    }
    return this.statusItems;
  }

  private getProjectStatus(projectPath: string): ProjectStatus {
    let projectStatus = this.projectStatuses.get(projectPath);
    if (projectStatus === undefined) {
      projectStatus = new ProjectStatus(this.getStatusItems());
      this.projectStatuses.set(projectPath, projectStatus);
    }
    return projectStatus;
  }
}
