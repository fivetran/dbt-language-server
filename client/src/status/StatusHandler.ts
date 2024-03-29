import { NO_PROJECT_PATH, StatusNotification } from 'dbt-language-server-common';
import { LanguageStatusItems } from './LanguageStatusItems';
import { NoProjectStatusGroup } from './status_group/NoProjectStatusGroup';
import { ProjectStatusGroup } from './status_group/ProjectStatusGroup';
import { StatusGroupBase } from './status_group/StatusGroupBase';

export class StatusHandler {
  private projectStatuses: Map<string, StatusGroupBase> = new Map();
  private statusItems = new LanguageStatusItems();
  private activeProjectPath?: string;

  onRestart(projectPath: string): void {
    this.getProjectStatus(projectPath).setBusy();
  }

  changeActiveProject(projectPath: string): void {
    this.getProjectStatus(projectPath).updateStatusUi();
    this.activeProjectPath = projectPath;
  }

  changeStatus(statusNotification: StatusNotification): void {
    const status = this.getProjectStatus(statusNotification.projectPath);
    status.updateStatusData(statusNotification);

    if (!this.activeProjectPath || this.activeProjectPath === statusNotification.projectPath) {
      status.updateStatusUi();
    }
  }

  private getProjectStatus(projectPath: string): StatusGroupBase {
    let projectStatus = this.projectStatuses.get(projectPath);
    if (projectStatus === undefined) {
      projectStatus =
        projectPath === NO_PROJECT_PATH ? new NoProjectStatusGroup(this.statusItems) : new ProjectStatusGroup(projectPath, this.statusItems);
      this.projectStatuses.set(projectPath, projectStatus);
    }
    return projectStatus;
  }
}
