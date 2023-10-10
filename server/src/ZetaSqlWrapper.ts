import { TypeKind } from '@fivetrandevelopers/zetasql';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { _zetasql_FunctionEnums_Mode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/FunctionEnums';
import { FunctionProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/FunctionProto';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { SignatureArgumentKind } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SignatureArgumentKind';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { SimpleTableProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleTableProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { Result, err, ok } from 'neverthrow';
import { DbtDestinationClient, Udf } from './DbtDestinationClient';
import { InformationSchemaConfigurator } from './InformationSchemaConfigurator';
import { SqlHeaderAnalyzer } from './SqlHeaderAnalyzer';
import { TableDefinition } from './TableDefinition';
import { ZetaSqlApi } from './ZetaSqlApi';
import { ParseResult, ZetaSqlParser } from './ZetaSqlParser';

export interface KnownColumn {
  name: string;
  type: string;
}

export abstract class ZetaSqlWrapper {
  static readonly PARTITION_TIME = '_PARTITIONTIME';
  static readonly PARTITION_DATE = '_PARTITIONDATE';

  private catalog: SimpleCatalogProto;
  private registeredTables: TableDefinition[] = [];
  private registeredFunctions = new Set<string>();
  private informationSchemaConfigurator: InformationSchemaConfigurator;

  constructor(
    private destinationClient: DbtDestinationClient,
    private zetaSqlApi: ZetaSqlApi,
    private zetaSqlParser: ZetaSqlParser,
    private sqlHeaderAnalyzer: SqlHeaderAnalyzer,
  ) {
    this.catalog = ZetaSqlWrapper.getDefaultCatalog();
    this.informationSchemaConfigurator = new InformationSchemaConfigurator(zetaSqlApi);
  }

  abstract createTableDefinition(namePath: string[]): TableDefinition;

  async initializeZetaSql(): Promise<void> {
    await this.zetaSqlApi.initialize();
  }

  async registerAllLanguageFeatures(): Promise<void> {
    if (!this.catalog.builtinFunctionOptions) {
      const languageOptions = await this.zetaSqlApi.getLanguageOptions();
      if (languageOptions) {
        this.catalog.builtinFunctionOptions = {
          languageOptions,
        };
      }
    }
  }

  static getDefaultCatalog(): SimpleCatalogProto {
    return {
      name: 'catalog',
      constant: [{ namePath: ['_dbt_max_partition'], type: { typeKind: TypeKind.TYPE_TIMESTAMP } }],
      namedType: [
        { name: 'int', type: { typeKind: TypeKind.TYPE_INT64 } },
        { name: 'smallint', type: { typeKind: TypeKind.TYPE_INT64 } },
        { name: 'integer', type: { typeKind: TypeKind.TYPE_INT64 } },
        { name: 'bigint', type: { typeKind: TypeKind.TYPE_INT64 } },
        { name: 'tinyint', type: { typeKind: TypeKind.TYPE_INT64 } },
        { name: 'byteint', type: { typeKind: TypeKind.TYPE_INT64 } },
      ],
      customFunction: [
        {
          namePath: ['contains_substr'],
          signature: [
            {
              argument: [
                { kind: SignatureArgumentKind.ARG_TYPE_ARBITRARY, numOccurrences: 1 },
                { type: { typeKind: TypeKind.TYPE_STRING }, numOccurrences: 1 },
                {
                  type: { typeKind: TypeKind.TYPE_STRING },

                  options: { cardinality: 'OPTIONAL', argumentName: 'json_scope', namedArgumentKind: 'NAMED_ONLY' },
                },
              ],
              returnType: { type: { typeKind: TypeKind.TYPE_BOOL } },
            },
          ],
        },
      ],
    };
  }

  resetCatalog(): void {
    this.catalog = ZetaSqlWrapper.getDefaultCatalog();
    this.registeredTables = [];
    this.registeredFunctions = new Set<string>();
  }

  async findTableNames(sql: string): Promise<TableDefinition[]> {
    try {
      const extractResult = await this.extractTableNamesFromStatement(sql);
      return extractResult.tableName.map(t => this.createTableDefinition(t.tableNameSegment));
    } catch (e) {
      console.log(e instanceof Error ? e.message : e);
    }
    return [];
  }

  getColumnsInTable(db: string | undefined, schema: string | undefined, tableName: string): KnownColumn[] | undefined {
    let parent: SimpleCatalogProto | undefined = this.catalog;
    if (db) {
      parent = parent.catalog?.find(c => c.name === db);
    }
    if (!parent) {
      return undefined;
    }

    if (schema) {
      parent = parent.catalog?.find(c => c.name === schema);
    }
    if (!parent) {
      return undefined;
    }

    const existingTable = parent.table?.find(t => t.name === tableName);
    if (!existingTable) {
      return undefined;
    }

    return existingTable.column?.map(c => {
      const name = c.name ?? '_default'; // TODO: fix this
      let type = 'string';
      for (const [key, value] of this.zetaSqlApi.getTypeKindNames().entries()) {
        if (value === c.type?.typeKind) {
          type = key;
        }
      }
      return { name, type };
    });
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
      if (table.external) {
        ZetaSqlWrapper.addColumn(existingTable, { name: '_FILE_NAME', type: { typeKind: TypeKind.TYPE_STRING }, isPseudoColumn: true });
      }

      if (table.timePartitioning) {
        this.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_TIME, { typeKind: TypeKind.TYPE_TIMESTAMP });
        this.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_DATE, { typeKind: TypeKind.TYPE_DATE });
      }
    }
  }

  async getParseResult(sql: string): Promise<ParseResult> {
    const languageOptions = await this.zetaSqlApi.getLanguageOptions();
    return this.zetaSqlParser.getParseResult(sql, languageOptions);
  }

  async registerPersistentUdfs(parseResult: ParseResult): Promise<void> {
    const namePaths = parseResult.functions.filter(f => !this.registeredFunctions.has(f.join(',')));
    for (const namePath of namePaths) {
      try {
        const udfs = await this.createUdfsFromNamePath(namePath);
        for (const udf of udfs) {
          this.registerUdf(udf);
        }
      } catch (e) {
        console.log(e);
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
      const languageOptions = await this.zetaSqlApi.getLanguageOptions();
      return this.sqlHeaderAnalyzer.getAllFunctionDeclarations(sqlHeader, languageOptions, this.catalog.builtinFunctionOptions);
    }
    return [];
  }

  createCatalogWithTempUdfs(udfs: FunctionProto[]): SimpleCatalogProto {
    const clonedCatalog = { ...this.catalog };
    clonedCatalog.customFunction = clonedCatalog.customFunction ? [...clonedCatalog.customFunction] : [];
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

  terminateServer(): void {
    this.zetaSqlApi.terminateServer();
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
    const func: FunctionProto = {
      namePath: udf.nameParts,
      signature: [
        {
          argument: udf.arguments?.map(a => ({
            kind: a.argumentKind === 'ANY_TYPE' ? SignatureArgumentKind.ARG_TYPE_ANY_1 : SignatureArgumentKind.ARG_TYPE_FIXED,
            type: a.type,
            numOccurrences: 1,
          })),
          returnType: udf.returnType
            ? {
                kind: SignatureArgumentKind.ARG_TYPE_FIXED,
                type: udf.returnType,
              }
            : {
                kind: SignatureArgumentKind.ARG_TYPE_ARBITRARY,
              },
        },
      ],
    };
    // To handle functions like (double, double) -> ANY
    if (!udf.returnType) {
      func.group = 'Templated_SQL_Function';
      func.mode = _zetasql_FunctionEnums_Mode.SCALAR;
      func.parseResumeLocation = {
        input: udf.definitionBody,
      };
      func.templatedSqlFunctionArgumentName = udf.arguments?.map(a => a.name ?? 'undefined');
    }
    return func;
  }

  private addPartitioningColumn(existingTable: SimpleTableProto, name: string, typeProto: TypeProto): void {
    ZetaSqlWrapper.addColumn(existingTable, ZetaSqlWrapper.createSimpleColumn(name, typeProto));
  }

  private static deleteColumn(table: SimpleTableProto, column: SimpleColumnProto): void {
    const columnIndex = table.column?.findIndex(c => c.name === column.name);
    if (columnIndex !== undefined) {
      table.column?.splice(columnIndex, 1);
    }
  }

  private async analyze(sqlStatement: string, simpleCatalog: SimpleCatalogProto): Promise<AnalyzeResponse__Output> {
    const response = await this.zetaSqlApi.analyze({
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

  private async createUdfsFromNamePath(namePath: string[]): Promise<Udf[]> {
    if (namePath.length === 2) {
      return this.destinationClient.getUdf(undefined, namePath[0], namePath[1]);
    }
    if (namePath.length === 3) {
      return this.destinationClient.getUdf(namePath[0], namePath[1], namePath[2]);
    }
    return [];
  }

  static createSimpleColumn(name: string, type: TypeProto | null): SimpleColumnProto {
    return { name, type };
  }

  private async extractTableNamesFromStatement(sqlStatement: string): Promise<ExtractTableNamesFromStatementResponse__Output> {
    const options = await this.zetaSqlApi.getLanguageOptions();
    const response = await this.zetaSqlApi.extractTableNamesFromStatement({
      sqlStatement,
      options,
    });
    if (!response) {
      throw new Error('Table names not found');
    }

    return response;
  }

  private createUnknownError(message: string): string {
    return `${message} [at 1:1]`;
  }
}
