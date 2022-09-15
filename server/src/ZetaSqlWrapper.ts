import { runServer, terminateServer, TypeKind, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { FunctionProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/FunctionProto';
import { LanguageVersion } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageVersion';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { SimpleTableProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleTableProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { err, ok, Result } from 'neverthrow';
import * as fs from 'node:fs';
import { BigQueryClient, Udf } from './bigquery/BigQueryClient';
import { DbtRepository } from './DbtRepository';
import { InformationSchemaConfigurator } from './InformationSchemaConfigurator';
import { ManifestModel } from './manifest/ManifestJson';
import { ModelFetcher } from './ModelFetcher';
import { SqlHeaderAnalyzer } from './SqlHeaderAnalyzer';
import { TableDefinition } from './TableDefinition';
import { arraysAreEqual, randomNumber } from './utils/Utils';
import { createType } from './utils/ZetaSqlUtils';
import { ZetaSqlParser } from './ZetaSqlParser';
import findFreePortPmfy = require('find-free-port');

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

  constructor(
    private dbtRepository: DbtRepository,
    private bigQueryClient: BigQueryClient,
    private zetaSqlParser: ZetaSqlParser,
    private sqlHeaderAnalyzer: SqlHeaderAnalyzer,
  ) {}

  getClient(): ZetaSQLClient {
    return ZetaSQLClient.getInstance();
  }

  async initializeZetaSql(): Promise<void> {
    const port = await findFreePortPmfy(randomNumber(ZetaSqlWrapper.MIN_PORT, ZetaSqlWrapper.MAX_PORT));
    console.log(`Starting zetasql on port ${port}`);
    runServer(port).catch(e => console.log(e));
    ZetaSQLClient.init(port);
    await this.getClient().testConnection();
  }

  isTableRegistered(table: TableDefinition): boolean {
    return this.registeredTables.some(t => t.equals(table));
  }

  getTableRef(model: ManifestModel, name: string): string[] | undefined {
    return model.refs.find(ref => ref.indexOf(name) === ref.length - 1);
  }

  static addChildCatalog(parent: SimpleCatalogProto, name: string): SimpleCatalogProto {
    let child = parent.catalog?.find(c => c.name === name);
    if (!child) {
      child = { name };
      parent.catalog = parent.catalog ?? [];
      parent.catalog.push(child);
    }
    return child;
  }

  registerTable(table: TableDefinition): void {
    if (!this.isTableRegistered(table)) {
      this.registeredTables.push(table);
    }

    let parent = this.catalog;

    if (!table.rawName) {
      const projectId = table.getProjectName();
      if (projectId) {
        parent = ZetaSqlWrapper.addChildCatalog(this.catalog, projectId);
      }

      const dataSetName = table.getDataSetName();
      if (dataSetName) {
        parent = ZetaSqlWrapper.addChildCatalog(parent, dataSetName);
      }
    }

    if (table.containsInformationSchema()) {
      this.informationSchemaConfigurator.fillInformationSchema(table, parent);
    } else {
      const tableName = table.rawName ?? table.getTableName();
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

  async getTempUdfs(modelFetcher: ModelFetcher): Promise<FunctionProto[]> {
    const model = await modelFetcher.getModel();
    if (model?.config?.sqlHeader) {
      const languageOptions = await this.getLanguageOptions();
      return this.sqlHeaderAnalyzer.getAllFunctionDeclarations(
        model.config.sqlHeader,
        languageOptions?.serialize(),
        this.catalog.builtinFunctionOptions,
      );
    }
    return [];
  }

  addTempUdfsToCatalog(catalog: SimpleCatalogProto, udfs: FunctionProto[]): SimpleCatalogProto {
    const clonedCatalog = { ...catalog };
    clonedCatalog.customFunction = clonedCatalog.customFunction ?? [];
    for (const udf of udfs) {
      if (!clonedCatalog.customFunction.some(f => f.namePath?.join(',') === udf.namePath?.join(','))) {
        clonedCatalog.customFunction.push(udf);
      }
    }
    return clonedCatalog;
  }

  registerUdf(udf: Udf): void {
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

  ensureUdfOwnerCatalogExists(udf: Udf): SimpleCatalogProto {
    let udfOwner = this.catalog;
    if (udf.nameParts.length > 2) {
      const projectCatalog = ZetaSqlWrapper.addChildCatalog(this.catalog, udf.nameParts[0]);
      udfOwner = ZetaSqlWrapper.addChildCatalog(projectCatalog, udf.nameParts[1]);
    } else if (udf.nameParts.length === 2) {
      udfOwner = ZetaSqlWrapper.addChildCatalog(this.catalog, udf.nameParts[0]);
    }
    return udfOwner;
  }

  createFunction(udf: Udf): FunctionProto {
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

  static udfAlreadyRegistered(udfOwner: SimpleCatalogProto, udf: Udf): boolean {
    return udfOwner.customFunction?.some(c => c.namePath && arraysAreEqual(c.namePath, udf.nameParts)) ?? false;
  }

  static addPartitioningColumn(existingTable: SimpleTableProto, name: string, type: string): void {
    ZetaSqlWrapper.addColumn(existingTable, ZetaSqlWrapper.createSimpleColumn(name, createType({ name, type })));
  }

  static deleteColumn(table: SimpleTableProto, column: SimpleColumnProto): void {
    const columnIndex = table.column?.findIndex(c => c.name === column.name);
    if (columnIndex !== undefined) {
      table.column?.splice(columnIndex, 1);
    }
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

  async analyze(sqlStatement: string, simpleCatalog: SimpleCatalogProto): Promise<AnalyzeResponse__Output> {
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

  async analyzeTable(originalFilePath: string, sql?: string): Promise<Result<AnalyzeResponse__Output, string>> {
    await this.registerAllLanguageFeatures(this.catalog);
    return this.analyzeTableInternal(originalFilePath, sql);
  }

  private async analyzeTableInternal(originalFilePath: string, sql?: string): Promise<Result<AnalyzeResponse__Output, string>> {
    const modelFetcher = new ModelFetcher(this.dbtRepository, originalFilePath);

    const compiledSql = sql ?? this.getCompiledSql(await modelFetcher.getModel());
    if (compiledSql === undefined) {
      return err('Compiled SQL not found');
    }

    let tables = await this.findTableNames(compiledSql);

    const settledResult = await Promise.allSettled(tables.filter(t => !this.isTableRegistered(t)).map(t => this.fillTableSchemaFromBq(t)));
    tables = settledResult.filter((v): v is PromiseFulfilledResult<TableDefinition> => v.status === 'fulfilled').map(v => v.value);

    for (const table of tables) {
      if (!this.isTableRegistered(table)) {
        const schemaIsFilled = table.schemaIsFilled();
        if (schemaIsFilled) {
          this.registerTable(table);
        } else {
          const model = await modelFetcher.getModel();
          if (!model) {
            return err(this.createUnknownError(`Model not found for table ${table.tableName ?? 'undefined'}`));
          }
          await this.analyzeRef(table, model);
        }
      }
    }

    await this.registerPersistentUdfs(compiledSql);
    const tempUdfs = await this.getTempUdfs(modelFetcher);
    const catalogWithTempUdfs = this.addTempUdfsToCatalog(this.catalog, tempUdfs);

    const ast = await this.getAstOrError(compiledSql, catalogWithTempUdfs);
    if (ast.isOk()) {
      const model = await modelFetcher.getModel();
      if (model) {
        const table = new TableDefinition([model.database, model.schema, model.name]);
        this.fillTableWithAnalyzeResponse(table, ast.value);
        this.registerTable(table);
      }
    }

    return ast;
  }

  async analyzeRef(table: TableDefinition, model: ManifestModel): Promise<void> {
    const ref = this.getTableRef(model, table.getTableName());
    if (ref) {
      const refModel = this.findModelByRefName(model, ref);
      if (refModel) {
        await this.analyzeTableInternal(refModel.originalFilePath);
      } else {
        console.log("Can't find ref model");
      }
    } else {
      console.log("Can't find ref");
    }
  }

  fillTableWithAnalyzeResponse(table: TableDefinition, analyzeOutput: AnalyzeResponse__Output): void {
    table.columns = analyzeOutput.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList
      .filter(c => c.column !== null)
      .map(c => ZetaSqlWrapper.createSimpleColumn(c.name, c.column?.type ?? null));
  }

  findModelByRefName(model: ManifestModel, ref: string[]): ManifestModel | undefined {
    const uniqueId = model.dependsOn.nodes.find(n => n.endsWith(ref.join('.')));
    const refModel = this.dbtRepository.models.find(m => m.uniqueId === uniqueId);
    if (!refModel) {
      console.log("Can't find ref model");
    }
    return refModel;
  }

  async registerAllLanguageFeatures(catalog: SimpleCatalogProto): Promise<void> {
    if (!catalog.builtinFunctionOptions) {
      const languageOptions = await this.getLanguageOptions();
      if (languageOptions) {
        catalog.builtinFunctionOptions = {
          languageOptions: languageOptions.serialize(),
        };
      }
    }
  }

  async createUdfFromNamePath(namePath: string[]): Promise<Udf | undefined> {
    if (namePath.length === 2) {
      return this.bigQueryClient.getUdf(undefined, namePath[0], namePath[1]);
    }
    if (namePath.length === 3) {
      return this.bigQueryClient.getUdf(namePath[0], namePath[1], namePath[2]);
    }
    return undefined;
  }

  async getNewCustomFunctions(sql: string): Promise<string[][]> {
    const languageOptions = await this.getLanguageOptions();
    const allFunctions = await this.zetaSqlParser.getAllFunctionCalls(sql, languageOptions?.serialize());
    return allFunctions.filter(f => !this.registeredFunctions.has(f.join(',')));
  }

  async getAstOrError(compiledSql: string, catalog: SimpleCatalogProto): Promise<Result<AnalyzeResponse__Output, string>> {
    try {
      const ast = await this.analyze(compiledSql, catalog);
      return ok(ast);
    } catch (e) {
      return err((e as Partial<Record<string, string>>)['details'] ?? this.createUnknownError('Unknown parser error'));
    }
  }

  getCompiledSql(model?: ManifestModel): string | undefined {
    if (!model) {
      return undefined;
    }
    const compiledPath = this.dbtRepository.getModelCompiledPath(model);
    try {
      return fs.readFileSync(compiledPath, 'utf8');
    } catch {
      console.log(`Cannot read ${compiledPath}`);
      return undefined;
    }
  }

  async fillTableSchemaFromBq(table: TableDefinition): Promise<TableDefinition> {
    if (table.containsInformationSchema()) {
      return table;
    }

    const dataSetName = table.getDataSetName();
    const tableName = table.getTableName();

    if (dataSetName && tableName) {
      const metadata = await this.bigQueryClient.getTableMetadata(dataSetName, tableName);
      if (metadata) {
        table.columns = metadata.schema.fields.map<ResolvedOutputColumnProto>(f => ZetaSqlWrapper.createSimpleColumn(f.name, createType(f)));
        table.timePartitioning = metadata.timePartitioning;
      }
    }
    return table;
  }

  static createSimpleColumn(name: string, type: TypeProto | null): SimpleColumnProto {
    return { name, type };
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

  async extractTableNamesFromStatement(sqlStatement: string): Promise<ExtractTableNamesFromStatementResponse__Output> {
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
        // https://github.com/google/zetasql/issues/115#issuecomment-1210881670
        this.languageOptions.options.reservedKeywords = ['QUALIFY'];
      } catch (e) {
        console.log(e instanceof Error ? e.stack : e);
      }
    }
    return this.languageOptions;
  }

  async terminateServer(): Promise<void> {
    await terminateServer();
  }
}
