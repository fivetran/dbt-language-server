import {
  runServer,
  SimpleCatalog,
  SimpleColumn,
  SimpleTable,
  SimpleType,
  terminateServer,
  TypeFactory,
  ZetaSQLClient,
} from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { LanguageFeature } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageFeature';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ZetaSQLBuiltinFunctionOptions } from '@fivetrandevelopers/zetasql/lib/ZetaSQLBuiltinFunctionOptions';
import { TableDefinition } from './TableDefinition';
import { randomNumber } from './utils/Utils';
import findFreePortPmfy = require('find-free-port');

export class ZetaSqlWrapper {
  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65535;

  private static readonly SUPPORTED_PLATFORMS = ['darwin', 'linux'];

  private readonly catalog = new SimpleCatalog('catalog');
  private supported = true;

  isSupported(): boolean {
    return this.supported;
  }

  async initializeZetaSql(): Promise<void> {
    if (ZetaSqlWrapper.SUPPORTED_PLATFORMS.includes(process.platform)) {
      const port = await findFreePortPmfy(randomNumber(ZetaSqlWrapper.MIN_PORT, ZetaSqlWrapper.MAX_PORT));
      console.log(`Starting zetasql on port ${port}`);
      runServer(port).catch(err => console.error(err));
      ZetaSQLClient.init(port);
      await this.getClient().testConnection();
    } else {
      this.supported = false;
    }
  }

  async extractTableNamesFromStatement(sqlStatement: string): Promise<ExtractTableNamesFromStatementResponse__Output> {
    if (!this.isSupported()) {
      throw new Error('Not supported');
    }

    const response = await this.getClient().extractTableNamesFromStatement({ sqlStatement });
    if (!response) {
      throw new Error('Table names not found');
    }

    return response;
  }

  getClient(): ZetaSQLClient {
    return ZetaSQLClient.getInstance(); // TODO refactor it on npm side
  }

  isCatalogRegistered(): boolean {
    return this.catalog.registered;
  }

  async registerCatalog(tableDefinitions: TableDefinition[]): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Not supported');
    }
    for (const t of tableDefinitions) {
      let parent = this.catalog;

      if (!t.rawName) {
        const projectId = t.getProjectName();
        if (projectId) {
          let projectCatalog = this.catalog.catalogs.get(projectId);
          if (!projectCatalog) {
            projectCatalog = new SimpleCatalog(projectId);
            await this.unregisterCatalog();
            this.catalog.addSimpleCatalog(projectCatalog);
          }
          parent = projectCatalog;
        }

        let dataSetCatalog = parent.catalogs.get(t.getDatasetName());
        if (!dataSetCatalog) {
          dataSetCatalog = new SimpleCatalog(t.getDatasetName());
          if (parent === this.catalog) {
            await this.unregisterCatalog();
          }
          parent.addSimpleCatalog(dataSetCatalog);
        }
        parent = dataSetCatalog;
      }

      const tableName = t.rawName ?? t.getTableName();
      let table = parent.tables.get(tableName);
      if (!table) {
        if (t.rawName) {
          await this.unregisterCatalog();
        }
        table = new SimpleTable(tableName);
        parent.addSimpleTable(tableName, table);
      }

      for (const newColumn of t.schema?.fields ?? []) {
        const existingColumn = table.columns.find(c => c.getName() === newColumn.name);
        if (!existingColumn) {
          const type = newColumn.type.toLowerCase();
          const typeKind = TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(type);
          if (typeKind) {
            const simpleColumn = new SimpleColumn(t.getTableName(), newColumn.name, new SimpleType(typeKind));
            table.addSimpleColumn(simpleColumn);
          } else {
            console.log(`Cannot find SimpleType for ${newColumn.type}`);
          }
        }
      }
    }

    await this.unregisterCatalog();
    await this.registerAllLanguageFeatures();
    try {
      await this.catalog.register();
    } catch (e) {
      console.error(e);
    }
  }

  private async registerAllLanguageFeatures(): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- builtinFunctionOptions from external lib can be null
    if (!this.catalog.builtinFunctionOptions) {
      const languageOptions = await new LanguageOptions().enableMaximumLanguageFeatures();
      languageOptions.options.enabledLanguageFeatures?.push(LanguageFeature.FEATURE_V_1_3_WITH_RECURSIVE);
      await this.catalog.addZetaSQLFunctions(new ZetaSQLBuiltinFunctionOptions(languageOptions));
    }
  }

  private async unregisterCatalog(): Promise<void> {
    if (this.catalog.registered) {
      try {
        await this.catalog.unregister();
      } catch (e) {
        console.error(e);
      }
    }
  }

  async analyze(rawSql: string): Promise<AnalyzeResponse__Output> {
    const response = await this.getClient().analyze({
      sqlStatement: rawSql,
      registeredCatalogId: this.catalog.registeredId,

      options: {
        parseLocationRecordType: ParseLocationRecordType.PARSE_LOCATION_RECORD_CODE_SEARCH,

        errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
        languageOptions: this.catalog.builtinFunctionOptions?.languageOptions,
      },
    });

    if (!response) {
      throw new Error('Analyze failed');
    }
    return response;
  }

  async terminateServer(): Promise<void> {
    if (this.isSupported()) {
      await terminateServer();
    }
  }
}
