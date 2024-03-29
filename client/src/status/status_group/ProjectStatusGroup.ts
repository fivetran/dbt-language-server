import { PackagesStatus, ProfilesYmlStatus, StatusNotification } from 'dbt-language-server-common';
import { LanguageStatusSeverity, RelativePattern, Uri } from 'vscode';
import { PACKAGES_YML } from '../../Utils';
import { InstallDbtPackages } from '../../commands/InstallDbtPackages';
import { LanguageStatusItems } from '../LanguageStatusItems';
import { StatusItemData } from '../StatusItemData';
import { StatusGroupBase } from './StatusGroupBase';

export class ProjectStatusGroup extends StatusGroupBase {
  private dbtPackagesData?: StatusItemData;
  private profilesYmlData?: StatusItemData;

  constructor(projectPath: string, items: LanguageStatusItems) {
    const filters = [{ pattern: new RelativePattern(Uri.file(projectPath), '**/*') }];
    super(projectPath, items, filters);

    this.items.dbtPackages.setDocumentFilter(filters);
    this.items.profilesYml.setDocumentFilter(filters);
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
    if (status.profilesYmlStatus) {
      this.updateProfilesYmlStatusItemData(status.profilesYmlStatus);
    }
  }

  private updateDbtPackagesUi(): void {
    if (this.dbtPackagesData) {
      this.items.dbtPackages.setState(
        this.dbtPackagesData.severity,
        this.dbtPackagesData.text,
        this.dbtPackagesData.detail,
        this.dbtPackagesData.command,
      );
    } else {
      this.items.dbtPackages.setBusy();
    }
  }

  private updateProfilesYmlUi(): void {
    if (this.profilesYmlData) {
      this.items.profilesYml.setState(
        this.profilesYmlData.severity,
        this.profilesYmlData.text,
        this.profilesYmlData.detail,
        this.profilesYmlData.command,
      );
    } else {
      this.items.dbtPackages.setBusy();
    }
  }

  private updateDbtPackagesStatusItemData(packagesStatus: PackagesStatus): void {
    const command = { command: InstallDbtPackages.ID, title: 'Install dbt packages', arguments: [this.projectPath] };
    this.dbtPackagesData = packagesStatus.packagesYmlFound
      ? {
          severity: LanguageStatusSeverity.Information,
          text: PACKAGES_YML,
          command,
        }
      : {
          severity: LanguageStatusSeverity.Information,
          text: `No ${PACKAGES_YML}`,
          detail: '',
          command,
        };
  }

  private updateProfilesYmlStatusItemData(profilesYmlStatus: ProfilesYmlStatus): void {
    this.profilesYmlData = {
      severity: LanguageStatusSeverity.Information,
      text: profilesYmlStatus.activeProfileName,
      detail: 'Current profile',
      command: { command: 'vscode.open', title: 'Change target credentials', arguments: [Uri.file(profilesYmlStatus.profilesYmlPath).toString()] },
    };
  }
}
