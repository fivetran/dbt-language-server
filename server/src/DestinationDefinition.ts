import { Dataset, DbtDestinationClient, Table } from './DbtDestinationClient';

export class DestinationDefinition {
  activeProject: string;
  projects = new Map<string, Dataset[]>();
  tables = new Map<string, Table[]>();

  constructor(private client: DbtDestinationClient) {
    this.activeProject = client.defaultProject;

    client
      .getDatasets()
      .then(datasets => {
        this.projects.set(this.activeProject, datasets);
        return this.projects;
      })
      .catch(e => console.log(`Error while fetching datasets: ${JSON.stringify(e)}`));
  }

  getDatasets(projectId?: string): Dataset[] {
    return this.projects.get(projectId ?? this.activeProject) ?? [];
  }

  getDataset(datasetName: string, projectName?: string): Dataset | undefined {
    return this.getDatasets(projectName).find(d => d.id === datasetName);
  }

  async getTables(datasetName: string, projectName?: string): Promise<Table[]> {
    const dataset = this.getDataset(datasetName, projectName);
    if (!dataset) {
      return [];
    }
    let foundTables = this.tables.get(datasetName);
    if (!foundTables) {
      foundTables = await this.client.getTables(datasetName, projectName);
      this.tables.set(datasetName, foundTables);
    }
    return foundTables;
  }
}
