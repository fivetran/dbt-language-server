import { PackagesStatus, StatusNotification } from 'dbt-language-server-common';
import { LanguageStatusSeverity, RelativePattern, Uri } from 'vscode';
import { InstallDbtPackages } from '../commands/InstallDbtPackages';
import { PACKAGES_YML, PROFILES_YML, PROFILES_YML_DEFAULT_URI } from '../Utils';
import { LanguageStatusItems } from './LanguageStatusItems';
import { NoProjectStatus } from './NoProjectStatus';
import { StatusItemData } from './StatusItemData';
import path = require('node:path');

export class ProjectStatus extends NoProjectStatus {
  private dbtPackagesData?: StatusItemData;
  private profilesYmlData: StatusItemData = {
    severity: LanguageStatusSeverity.Information,
    text: PROFILES_YML,
    detail: `[Open](${PROFILES_YML_DEFAULT_URI.toString()})`,
  };

  constructor(projectPath: string, items: LanguageStatusItems) {
    super(projectPath, items);

    const documentFilter = { pattern: new RelativePattern(Uri.file(projectPath), '**/*') };
    this.items.dbtPackages.setDocumentFilter(documentFilter);
    this.items.profilesYml.setDocumentFilter(documentFilter);
  }

  override setBusy(): void {
    super.setBusy();

    this.items.dbtPackages.setBusy();
    this.items.profilesYml.setBusy();
  }

  override updateStatusUi(): void {
    super.updateStatusUi();

    this.updateDbtPackagesUi();
    this.updateProfilesYmlUi();
  }

  override updateStatusData(status: StatusNotification): void {
    super.updateStatusData(status);

    if (status.packagesStatus) {
      this.updateDbtPackagesStatusItemData(status.packagesStatus);
    }
  }

  private updateDbtPackagesUi(): void {
    if (!this.dbtPackagesData) {
      this.items.dbtPackages.setBusy();
    } else {
      this.items.dbtPackages.setState(
        this.dbtPackagesData.severity,
        this.dbtPackagesData.text,
        this.dbtPackagesData.detail,
        this.dbtPackagesData.command,
      );
    }
  }

  private updateProfilesYmlUi(): void {
    this.items.profilesYml.setState(this.profilesYmlData.severity, this.profilesYmlData.text, this.profilesYmlData.detail);
  }

  private updateDbtPackagesStatusItemData(packagesStatus: PackagesStatus): void {
    const command = { command: InstallDbtPackages.ID, title: 'Install dbt Packages', arguments: [this.projectPath] };
    this.dbtPackagesData = packagesStatus.packagesYmlFound
      ? {
          severity: LanguageStatusSeverity.Information,
          text: PACKAGES_YML,
          detail: `[Open](${Uri.file(path.join(this.projectPath, 'packages.yml')).toString()})`,
          command,
        }
      : {
          severity: LanguageStatusSeverity.Information,
          text: `No ${PACKAGES_YML}`,
          detail: '',
          command,
        };
  }
}
