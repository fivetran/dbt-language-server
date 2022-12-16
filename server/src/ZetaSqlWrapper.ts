import { runServer, terminateServer, TypeKind, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { FunctionProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/FunctionProto';
import { LanguageFeature } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageFeature';
import { LanguageVersion } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageVersion';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { SimpleTableProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleTableProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { err, ok, Result } from 'neverthrow';
import { BigQueryClient, Udf } from './bigquery/BigQueryClient';
import { FeatureFinder } from './feature_finder/FeatureFinder';
import { InformationSchemaConfigurator } from './InformationSchemaConfigurator';
import { ProcessExecutor } from './ProcessExecutor';
import { SqlHeaderAnalyzer } from './SqlHeaderAnalyzer';
import { TableDefinition } from './TableDefinition';
import { randomNumber } from './utils/Utils';
import { createType } from './utils/ZetaSqlUtils';
import { ZetaSqlParser } from './ZetaSqlParser';
import findFreePortPmfy = require('find-free-port');
import path = require('node:path');

export class ZetaSqlWrapper {
  static readonly PARTITION_TIME = '_PARTITIONTIME';
  static readonly PARTITION_DATE = '_PARTITIONDATE';

  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65_535;

  private readonly catalog: SimpleCatalogProto = {
    name: 'catalog',
    constant: [{ namePath: ['_dbt_max_partition'], type: { typeKind: TypeKind.TYPE_DATE } }],
  };
  private languageOptions: LanguageOptions | undefined;
  private registeredTables: TableDefinition[] = [];
  private registeredFunctions = new Set<string>();
  private informationSchemaConfigurator = new InformationSchemaConfigurator();

  constructor(private bigQueryClient: BigQueryClient, private zetaSqlParser: ZetaSqlParser, private sqlHeaderAnalyzer: SqlHeaderAnalyzer) {}

  async initializeZetaSql(): Promise<void> {
    const port = await findFreePortPmfy(randomNumber(ZetaSqlWrapper.MIN_PORT, ZetaSqlWrapper.MAX_PORT));

    console.log(`Starting zetasql on port ${port}`);
    if (process.platform === 'win32') {
      const slash = await import('slash');
      const fsPath = slash.default(path.normalize(`${__dirname}/../remote_server_executable`));
      const wslPath = `/mnt/${fsPath.replace(':', '')}`;
      console.log(`Path in WSL: ${wslPath}`);
      const stdHandler = (data: string): void => {
        console.log(data);
      };
      new ProcessExecutor()
        .execProcess(`wsl -d ${FeatureFinder.getWslUbuntuName()} "${wslPath}" ${port}`, stdHandler, stdHandler)
        .catch(e => console.log(e));
    } else {
      runServer(port).catch(e => console.log(e));
    }

    ZetaSQLClient.init(port);
    await this.getClient().testConnection();
  }

  async registerAllLanguageFeatures(): Promise<void> {
    if (!this.catalog.builtinFunctionOptions) {
      const languageOptions = await this.getLanguageOptions();
      if (languageOptions) {
        this.catalog.builtinFunctionOptions = {
          languageOptions: languageOptions.serialize(),
        };
      }
    }
  }

  async findTableNames(sql: string): Promise<TableDefinition[]> {
    try {
      const extractResult = await this.extractTableNamesFromStatement(sql);
      return extractResult.tableName.map(t => new TableDefinition(t.tableNameSegment));
    } catch (e) {
      console.log(e);
    }
    return [];
  }

  registerTable(table: TableDefinition): void {
    if (!this.isTableRegistered(table)) {
      this.registeredTables.push(table);
    }

    let parent = this.catalog;

    const projectId = table.getProjectCatalogName();
    if (projectId) {
      parent = ZetaSqlWrapper.addChildCatalog(this.catalog, projectId);
    }

    const dataSetName = table.getDatasetCatalogName();
    if (dataSetName) {
      parent = ZetaSqlWrapper.addChildCatalog(parent, dataSetName);
    }

    if (table.containsInformationSchema()) {
      this.informationSchemaConfigurator.fillInformationSchema(table, parent);
    } else {
      const tableName = table.getTableNameInZetaSql();
      let existingTable = parent.table?.find(t => t.name === tableName);
      if (!existingTable) {
        existingTable = {
          name: tableName,
        };
        parent.table = parent.table ?? [];
        parent.table.push(existingTable);
      }

      for (const oldColumn of existingTable.column ?? []) {
        if (!table.columns?.some(c => c.name === oldColumn.name)) {
          ZetaSqlWrapper.deleteColumn(existingTable, oldColumn);
        }
      }

      for (const newColumn of table.columns ?? []) {
        ZetaSqlWrapper.addColumn(existingTable, newColumn);
      }

      if (table.timePartitioning) {
        ZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_TIME, 'timestamp');
        ZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_DATE, 'date');
      }
    }
  }

  async registerPersistentUdfs(compiledSql: string): Promise<void> {
    const namePaths = await this.getNewCustomFunctions(compiledSql);
    for (const namePath of namePaths) {
      const udf = await this.createUdfFromNamePath(namePath);
      if (udf) {
        this.registerUdf(udf);
      }
    }
  }

  async getAstOrError(compiledSql: string, catalog: SimpleCatalogProto): Promise<Result<AnalyzeResponse__Output, string>> {
    try {
      const ast = await this.analyze(compiledSql, catalog);
      return ok(ast);
    } catch (e) {
      return err((e as Partial<Record<string, string>>)['details'] ?? this.createUnknownError('Unknown parser error'));
    }
  }

  async getTempUdfs(sqlHeader?: string): Promise<FunctionProto[]> {
    if (sqlHeader) {
      const languageOptions = await this.getLanguageOptions();
      return this.sqlHeaderAnalyzer.getAllFunctionDeclarations(sqlHeader, languageOptions?.serialize(), this.catalog.builtinFunctionOptions);
    }
    return [];
  }

  createCatalogWithTempUdfs(udfs: FunctionProto[]): SimpleCatalogProto {
    const clonedCatalog = { ...this.catalog };
    clonedCatalog.customFunction = clonedCatalog.customFunction ?? [];
    for (const udf of udfs) {
      if (!clonedCatalog.customFunction.some(f => f.namePath?.join(',') === udf.namePath?.join(','))) {
        clonedCatalog.customFunction.push(udf);
      }
    }
    return clonedCatalog;
  }

  isTableRegistered(table: TableDefinition): boolean {
    return this.registeredTables.some(t => t.equals(table));
  }

  async terminateServer(): Promise<void> {
    await terminateServer();
  }

  static addColumn(table: SimpleTableProto, newColumn: SimpleColumnProto): void {
    const columnIndex = table.column?.findIndex(c => c.name === newColumn.name);
    if (table.column && columnIndex !== undefined && columnIndex > -1) {
      table.column[columnIndex] = newColumn;
    } else {
      table.column = table.column ?? [];
      table.column.push(newColumn);
    }
  }

  private getClient(): ZetaSQLClient {
    return ZetaSQLClient.getInstance();
  }

  private static addChildCatalog(parent: SimpleCatalogProto, name: string): SimpleCatalogProto {
    let child = parent.catalog?.find(c => c.name === name);
    if (!child) {
      child = { name };
      parent.catalog = parent.catalog ?? [];
      parent.catalog.push(child);
    }
    return child;
  }

  private registerUdf(udf: Udf): void {
    if (udf.nameParts.length <= 1) {
      console.log('Udf with wrong name path found');
      return;
    }
    const udfOwner = this.ensureUdfOwnerCatalogExists(udf);

    const func = this.createFunction(udf);

    udfOwner.customFunction = udfOwner.customFunction ?? [];
    if (!udfOwner.customFunction.some(c => c.namePath?.join(',') === func.namePath?.join(','))) {
      udfOwner.customFunction.push(func);
      this.registeredFunctions.add(udf.nameParts.join(','));
    }
  }

  private ensureUdfOwnerCatalogExists(udf: Udf): SimpleCatalogProto {
    let udfOwner = this.catalog;
    if (udf.nameParts.length > 2) {
      const projectCatalog = ZetaSqlWrapper.addChildCatalog(this.catalog, udf.nameParts[0]);
      udfOwner = ZetaSqlWrapper.addChildCatalog(projectCatalog, udf.nameParts[1]);
    } else if (udf.nameParts.length === 2) {
      udfOwner = ZetaSqlWrapper.addChildCatalog(this.catalog, udf.nameParts[0]);
    }
    return udfOwner;
  }

  private createFunction(udf: Udf): FunctionProto {
    return {
      namePath: udf.nameParts,
      signature: [
        {
          argument: udf.arguments?.map(a => ({
            type: a.type,
            numOccurrences: 1,
          })),
          returnType: {
            type: udf.returnType,
          },
        },
      ],
    };
  }

  private static addPartitioningColumn(existingTable: SimpleTableProto, name: string, type: string): void {
    ZetaSqlWrapper.addColumn(existingTable, ZetaSqlWrapper.createSimpleColumn(name, createType({ name, type })));
  }

  private static deleteColumn(table: SimpleTableProto, column: SimpleColumnProto): void {
    const columnIndex = table.column?.findIndex(c => c.name === column.name);
    if (columnIndex !== undefined) {
      table.column?.splice(columnIndex, 1);
    }
  }

  private async analyze(sqlStatement: string, simpleCatalog: SimpleCatalogProto): Promise<AnalyzeResponse__Output> {
    const response = await this.getClient().analyze({
      sqlStatement,
      simpleCatalog,

      options: {
        parseLocationRecordType: ParseLocationRecordType.PARSE_LOCATION_RECORD_CODE_SEARCH,

        errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
        languageOptions: simpleCatalog.builtinFunctionOptions?.languageOptions,
      },
    });

    if (!response) {
      throw new Error('Analyze failed');
    }
    return response;
  }

  private async createUdfFromNamePath(namePath: string[]): Promise<Udf | undefined> {
    if (namePath.length === 2) {
      return this.bigQueryClient.getUdf(undefined, namePath[0], namePath[1]);
    }
    if (namePath.length === 3) {
      return this.bigQueryClient.getUdf(namePath[0], namePath[1], namePath[2]);
    }
    return undefined;
  }

  private async getNewCustomFunctions(sql: string): Promise<string[][]> {
    const languageOptions = await this.getLanguageOptions();
    const allFunctions = await this.zetaSqlParser.getAllFunctionCalls(sql, languageOptions?.serialize());
    return allFunctions.filter(f => !this.registeredFunctions.has(f.join(',')));
  }

  static createSimpleColumn(name: string, type: TypeProto | null): SimpleColumnProto {
    return { name, type };
  }

  private async extractTableNamesFromStatement(sqlStatement: string): Promise<ExtractTableNamesFromStatementResponse__Output> {
    const languageOptions = await this.getLanguageOptions();
    const response = await this.getClient().extractTableNamesFromStatement({
      sqlStatement,
      options: languageOptions?.serialize(),
    });
    if (!response) {
      throw new Error('Table names not found');
    }

    return response;
  }

  private createUnknownError(message: string): string {
    return `${message} [at 1:1]`;
  }

  private async getLanguageOptions(): Promise<LanguageOptions | undefined> {
    if (!this.languageOptions) {
      try {
        this.languageOptions = await new LanguageOptions().enableMaximumLanguageFeatures();
        const featuresForVersion = await LanguageOptions.getLanguageFeaturesForVersion(LanguageVersion.VERSION_CURRENT);
        featuresForVersion.forEach(f => this.languageOptions?.enableLanguageFeature(f));
        this.languageOptions.enableLanguageFeature(LanguageFeature.FEATURE_INTERVAL_TYPE);
        // https://github.com/google/zetasql/issues/115#issuecomment-1210881670
        this.languageOptions.options.reservedKeywords = ['QUALIFY'];
      } catch (e) {
        console.log(e instanceof Error ? e.stack : e);
      }
    }
    return this.languageOptions;
  }
}
