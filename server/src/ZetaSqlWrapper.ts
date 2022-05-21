import {
  ArrayType,
  runServer,
  SimpleCatalog,
  SimpleColumn,
  SimpleTable,
  SimpleType,
  StructType,
  terminateServer,
  TypeFactory,
  TypeKind,
  ZetaSQLClient,
} from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { Type } from '@fivetrandevelopers/zetasql/lib/Type';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { LanguageVersion } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageVersion';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ZetaSQLBuiltinFunctionOptions } from '@fivetrandevelopers/zetasql/lib/ZetaSQLBuiltinFunctionOptions';
import { ColumnDefinition, TableDefinition } from './TableDefinition';
import { randomNumber } from './utils/Utils';
import findFreePortPmfy = require('find-free-port');

export class ZetaSqlWrapper {
  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65535;

  private static readonly SUPPORTED_PLATFORMS = ['darwin', 'linux'];

  private readonly catalog = new SimpleCatalog('catalog');
  private supported = true;

  private languageOptions: LanguageOptions | undefined;

  isSupported(): boolean {
    return this.supported;
  }

  private async getLanguageOptions(): Promise<LanguageOptions | undefined> {
    if (!this.languageOptions) {
      try {
        this.languageOptions = await new LanguageOptions().enableMaximumLanguageFeatures();
        (await LanguageOptions.getLanguageFeaturesForVersion(LanguageVersion.VERSION_CURRENT)).forEach(f =>
          this.languageOptions?.enableLanguageFeature(f),
        );
      } catch (e) {
        console.log(e instanceof Error ? e.stack : e);
      }
    }
    return this.languageOptions;
  }

  async initializeZetaSql(): Promise<void> {
    if (ZetaSqlWrapper.SUPPORTED_PLATFORMS.includes(process.platform)) {
      const port = await findFreePortPmfy(randomNumber(ZetaSqlWrapper.MIN_PORT, ZetaSqlWrapper.MAX_PORT));
      console.log(`Starting zetasql on port ${port}`);
      runServer(port).catch(err => console.log(err));
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
    const response = await this.getClient().extractTableNamesFromStatement({
      sqlStatement,
      options: (await this.getLanguageOptions())?.serialize(),
    });
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
        this.addColumn(table, newColumn, tableName);
      }

      if (t.timePartitioning) {
        this.addColumn(table, { name: '_PARTITIONTIME', type: 'timestamp' }, tableName);
        this.addColumn(table, { name: '_PARTITIONDATE', type: 'date' }, tableName);
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

  addColumn(table: SimpleTable, newColumn: ColumnDefinition, tableName: string): void {
    const existingColumn = table.columns.find(c => c.getName() === newColumn.name);
    if (!existingColumn) {
      const simpleColumn = new SimpleColumn(tableName, newColumn.name, this.createType(newColumn));
      table.addSimpleColumn(simpleColumn);
    }
  }

  createType(newColumn: ColumnDefinition): Type {
    const bigQueryType = newColumn.type.toLowerCase();
    const typeKind = TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(bigQueryType);
    let resultType: Type;
    if (typeKind) {
      resultType = new SimpleType(typeKind);
    } else if (bigQueryType === 'record') {
      const columns = newColumn.fields?.map(f => ({ name: f.name, type: this.createType(f) }));
      resultType = new StructType(columns ?? []);
    } else {
      console.log(`Cannot find SimpleType for ${newColumn.type}`); // TODO: fix all these issues
      resultType = new SimpleType(TypeKind.TYPE_STRING);
    }

    return newColumn.mode === 'REPEATED' ? new ArrayType(resultType) : resultType;
  }

  private async registerAllLanguageFeatures(): Promise<void> {
    if (!this.catalog.builtinFunctionOptions) {
      const languageOptions = await this.getLanguageOptions();
      if (languageOptions) {
        await this.catalog.addZetaSQLFunctions(new ZetaSQLBuiltinFunctionOptions(languageOptions));
      }
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
