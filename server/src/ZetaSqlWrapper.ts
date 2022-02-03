import { AnalyzeRequest, runServer, SimpleCatalog, terminateServer, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { TableDefinition } from './TableDefinition';
import { randomNumber } from './Utils';
import { ZetaSqlCatalog } from './ZetaSqlCatalog';
import findFreePortPmfy = require('find-free-port');

export class ZetaSqlWrapper {
  private catalog: ZetaSqlCatalog;

  constructor(private client?: ZetaSQLClient, catalog?: ZetaSqlCatalog) {
    this.catalog = catalog ?? ZetaSqlCatalog.getInstance();
  }

  async initializeZetaSql(): Promise<void> {
    const port = await findFreePortPmfy(randomNumber(1024, 65535));
    console.log(`Starting zetasql on port ${port}`);
    runServer(port).catch(err => console.error(err));
    ZetaSQLClient.init(port);
    await this.getClient().testConnection();
  }

  getClient(): ZetaSQLClient {
    return this.client ?? ZetaSQLClient.getInstance(); // TODO refactor it on npm side
  }

  getCatalog(): SimpleCatalog {
    return this.catalog.getCatalog();
  }

  isCatalogRegistered(): boolean {
    return this.catalog.isRegistered();
  }

  async registerCatalog(tableDefinitions: TableDefinition[]): Promise<void> {
    return this.catalog.register(tableDefinitions);
  }

  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse__Output> {
    return this.getClient().analyze(request);
  }

  async terminateServer(): Promise<void> {
    await terminateServer();
  }
}
