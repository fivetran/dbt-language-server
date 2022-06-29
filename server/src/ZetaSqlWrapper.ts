import { runServer, terminateServer, TypeFactory, TypeKind, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { LanguageVersion } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageVersion';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { SimpleTableProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleTableProto';
import { StructFieldProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/StructFieldProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import * as fs from 'fs';
import { err, ok, Result } from 'neverthrow';
import { BigQueryClient } from './bigquery/BigQueryClient';
import { DbtRepository } from './DbtRepository';
import { InformationSchemaConfigurator } from './InformationSchemaConfigurator';
import { ManifestModel } from './manifest/ManifestJson';
import { ColumnDefinition, TableDefinition } from './TableDefinition';
import { randomNumber } from './utils/Utils';
import path = require('path');
import findFreePortPmfy = require('find-free-port');

export class ZetaSqlWrapper {
  static readonly PARTITION_TIME = '_PARTITIONTIME';
  static readonly PARTITION_DATE = '_PARTITIONDATE';

  private static readonly MIN_PORT = 1024;
  private static readonly MAX_PORT = 65535;

  private static readonly SUPPORTED_PLATFORMS = ['darwin', 'linux'];

  private readonly catalog: SimpleCatalogProto = { name: 'catalog' };
  private supported = true;
  private languageOptions: LanguageOptions | undefined;
  private registeredTables: TableDefinition[] = [];
  private informationSchemaConfigurator = new InformationSchemaConfigurator();

  constructor(private dbtRepository: DbtRepository, private bigQueryClient: BigQueryClient) {}

  getClient(): ZetaSQLClient {
    return ZetaSQLClient.getInstance();
  }

  async initializeZetaSql(): Promise<void> {
    if (ZetaSqlWrapper.SUPPORTED_PLATFORMS.includes(process.platform)) {
      const port = await findFreePortPmfy(randomNumber(ZetaSqlWrapper.MIN_PORT, ZetaSqlWrapper.MAX_PORT));
      console.log(`Starting zetasql on port ${port}`);
      runServer(port).catch(e => console.log(e));
      ZetaSQLClient.init(port);
      await this.getClient().testConnection();
    } else {
      this.supported = false;
    }
  }

  isSupported(): boolean {
    return this.supported;
  }

  isTableRegistered(table: TableDefinition): boolean {
    return this.registeredTables.some(t => t.equals(table));
  }

  getTableRef(model: ManifestModel, name: string): string[] | undefined {
    return model.refs.find(ref => ref.findIndex(r => r === name) === ref.length - 1);
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
    this.registeredTables.push(table);

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

      for (const newColumn of table.columns ?? []) {
        ZetaSqlWrapper.addColumn(existingTable, newColumn);
      }

      if (table.timePartitioning) {
        ZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_TIME, 'timestamp');
        ZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_DATE, 'date');
      }
    }
  }

  updateTable(table: TableDefinition): void {
    if (table.containsInformationSchema()) {
      console.log('Update of information schema tables is not available');
      return;
    }

    let parent = this.catalog;

    if (!table.rawName) {
      const projectId = table.getProjectName();
      if (projectId) {
        const projectCatalog = parent.catalog?.find(c => c.name === projectId);
        if (projectCatalog) {
          parent = projectCatalog;
        }
      }

      const dataSetName = table.getDataSetName();
      if (dataSetName) {
        const dataSetCatalog = parent.catalog?.find(c => c.name === dataSetName);
        if (dataSetCatalog) {
          parent = dataSetCatalog;
        }
      }
    }

    const tableName = table.rawName ?? table.getTableName();
    const existingTable = parent.table?.find(t => t.name === tableName);
    if (!existingTable) {
      console.log('Table not found');
      return;
    }

    const newColumns = (table.columns ?? []).filter(t => existingTable.column?.find(e => e.name === t.name) === undefined);
    for (const newColumn of newColumns) {
      ZetaSqlWrapper.addColumn(existingTable, newColumn);
    }

    // if (table.timePartitioning) {
    //   ZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_TIME, 'timestamp');
    //   ZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_DATE, 'date');
    // }
  }

  static addPartitioningColumn(existingTable: SimpleTableProto, name: string, type: string): void {
    ZetaSqlWrapper.addColumn(existingTable, ZetaSqlWrapper.createSimpleColumn(name, ZetaSqlWrapper.createType({ name, type })));
  }

  static addColumn(table: SimpleTableProto, newColumn: SimpleColumnProto): void {
    const column = table.column?.find(c => c.name === newColumn.name);
    if (!column) {
      table.column = table.column ?? [];
      table.column.push(newColumn);
    }
  }

  static createType(newColumn: ColumnDefinition): TypeProto {
    const bigQueryType = newColumn.type.toLowerCase();
    const typeKind = TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(bigQueryType);
    let resultType: TypeProto;
    if (typeKind) {
      resultType = {
        typeKind,
      };
    } else if (bigQueryType === 'record') {
      resultType = {
        typeKind: TypeKind.TYPE_STRUCT,
        structType: {
          field: newColumn.fields?.map<StructFieldProto>(f => ({
            fieldName: f.name,
            fieldType: this.createType(f),
          })),
        },
      };
    } else {
      console.log(`Cannot find TypeKind for ${newColumn.type}`); // TODO: fix all these issues
      resultType = {
        typeKind: TypeKind.TYPE_STRING,
      };
    }
    if (newColumn.mode?.toLocaleLowerCase() === 'repeated') {
      resultType = {
        typeKind: TypeKind.TYPE_ARRAY,
        arrayType: {
          elementType: resultType,
        },
      };
    }
    return resultType;
  }

  async analyze(sql: string, catalog: SimpleCatalogProto): Promise<AnalyzeResponse__Output> {
    const response = await this.getClient().analyze({
      sqlStatement: sql,
      simpleCatalog: catalog,

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

  async analyzeTable(originalFilePath: string, sql?: string): Promise<Result<AnalyzeResponse__Output, string>> {
    await this.registerAllLanguageFeatures(this.catalog);
    return this.analyzeTableInternal(originalFilePath, sql);
  }

  private async analyzeTableInternal(originalFilePath: string, sql?: string): Promise<Result<AnalyzeResponse__Output, string>> {
    const compiledSql = sql ?? this.getCompiledSql(originalFilePath);
    if (!compiledSql) {
      return err('Compiled SQL not found');
    }

    const model = this.getModel(originalFilePath);
    const tables = await this.findTableNames(compiledSql);

    for (const table of tables) {
      if (this.isTableRegistered(table)) {
        continue;
      }
      const schemaUpdated = await this.updateTableSchema(table);
      if (!schemaUpdated) {
        if (!model) {
          return err('Model not found');
        }

        await this.analyzeRef(table, model);
      }
      this.registerTable(table);
    }

    const ast = await this.getAstOrError(compiledSql);
    if (ast.isOk() && model) {
      const table = new TableDefinition([model.database, model.schema, model.name]);
      table.columns = ast.value.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList
        .filter(c => c.column !== null)
        .map(c => ZetaSqlWrapper.createSimpleColumn(c.name, c.column?.type ?? null));
      if (this.isTableRegistered(table)) {
        this.registerTable(table);
      } else {
        this.updateTable(table);
      }
    }

    return ast;
  }

  async analyzeRef(table: TableDefinition, model: ManifestModel): Promise<void> {
    const ref = this.getTableRef(model, table.getTableName());
    if (ref) {
      const refModel = this.findModelByRefName(model, ref);
      if (refModel) {
        const analyzeResult = await this.analyzeTableInternal(refModel.originalFilePath);
        if (analyzeResult.isOk()) {
          table.columns = analyzeResult.value.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList
            .filter(c => c.column !== null)
            .map(c => ZetaSqlWrapper.createSimpleColumn(c.name, c.column?.type ?? null));
        }
      } else {
        console.log(`Can't find ref model`);
      }
    } else {
      console.log(`Can't find ref`);
    }
  }

  findModelByRefName(model: ManifestModel, ref: string[]): ManifestModel | undefined {
    const uniqueId = model.dependsOn.nodes.find(n => n.endsWith(ref.join('.')));
    const refModel = this.dbtRepository.models.find(m => m.uniqueId === uniqueId);
    if (!refModel) {
      console.log(`Can't find ref model`);
    }
    return refModel;
  }

  getModel(originalFilePath: string): ManifestModel | undefined {
    const model = this.dbtRepository.models.find(m => m.originalFilePath === originalFilePath);
    if (!model) {
      console.log(`Model ${originalFilePath} not found`);
    }
    return model;
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

  async getAstOrError(compiledSql: string): Promise<Result<AnalyzeResponse__Output, string>> {
    try {
      const ast = await this.analyze(compiledSql, this.catalog);
      return ok(ast);
    } catch (e) {
      return err((e as Partial<Record<string, string>>)['details'] ?? 'Unknown parser error [at 0:0]');
    }
  }

  getCompiledSql(originalFilePath: string): string | undefined {
    const model = this.getModel(originalFilePath);
    if (!model) {
      return undefined;
    }
    const compiledPath = path.resolve(this.dbtRepository.dbtTargetPath, 'compiled', model.packageName, model.originalFilePath);
    try {
      return fs.readFileSync(compiledPath, 'utf8');
    } catch (e) {
      console.log(`Cannot read ${compiledPath}`);
      return undefined;
    }
  }

  async updateTableSchema(table: TableDefinition): Promise<boolean> {
    if (table.containsInformationSchema()) {
      return true;
    }

    const dataSetName = table.getDataSetName();
    const tableName = table.getTableName();

    if (dataSetName && tableName) {
      const metadata = await this.bigQueryClient.getTableMetadata(dataSetName, tableName);
      if (metadata) {
        table.columns = metadata.schema.fields.map<ResolvedOutputColumnProto>(f =>
          ZetaSqlWrapper.createSimpleColumn(f.name, ZetaSqlWrapper.createType(f)),
        );
        table.timePartitioning = metadata.timePartitioning;
        return true;
      }
    }
    return false;
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

  async terminateServer(): Promise<void> {
    if (this.isSupported()) {
      await terminateServer();
    }
  }
}
