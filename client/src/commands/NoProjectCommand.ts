import { NO_PROJECT_PATH } from 'dbt-language-server-common';
import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { DbtWizardLanguageClient } from '../lsp_client/DbtWizardLanguageClient';

export abstract class NoProjectCommand {
  constructor(private dbtLanguageClientManager: DbtLanguageClientManager) {}

  async getClient(projectPath?: string): Promise<DbtWizardLanguageClient | undefined> {
    if (projectPath === NO_PROJECT_PATH) {
      return this.dbtLanguageClientManager.noProjectClient;
    }
    return projectPath === undefined
      ? this.dbtLanguageClientManager.getClientForActiveDocument()
      : this.dbtLanguageClientManager.getClientByPath(projectPath);
  }
}
