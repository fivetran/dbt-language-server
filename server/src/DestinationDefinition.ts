import { Dataset, Table } from '@google-cloud/bigquery';
import { BigQueryClient } from './BigQueryClient';
import { ServiceAccountCredentials, ServiceAccountJsonCredentials } from './YamlParser';

export class DestinationDefinition {
  activeProject: string;
  projects = new Map<string, Dataset[]>();
  tables = new Map<string, Table[]>();
  columns = new Map<string, any[]>();

  constructor(credentials: ServiceAccountCredentials | ServiceAccountJsonCredentials) {
    this.activeProject = credentials.project;
    const client = BigQueryClient.buildClient(credentials);

    if (client) {
      client
        .getDatasets()
        .then(datasetsResponse => {
          const [datasets] = datasetsResponse;
          this.projects.set(this.activeProject, datasets);
        })
        .catch(e => console.log(`Error while fetching datasets: ${JSON.stringify(e)}`));
    }
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
      [foundTables] = await dataset.getTables();
      this.tables.set(datasetName, foundTables);
    }
    return foundTables;
  }

  async getColumns(datasetName: string, tableName: string, projectName?: string): Promise<any[]> {
    const tables = await this.getTables(datasetName, projectName);
    const table = tables.find(t => t.id === tableName);
    if (!table) {
      return [];
    }

    let foundColumns = this.columns.get(datasetName);
    if (!foundColumns) {
      const [metadata] = await table.getMetadata();
      foundColumns = metadata?.schema?.fields;
      if (foundColumns) {
        this.columns.set(datasetName, foundColumns);
      }
    }
    return foundColumns ?? [];
  }
}
