import { TypeFactory, TypeKind, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
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
import { arraysAreEqual } from './utils/Utils';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';
import path = require('path');

export class NewZetaSqlWrapper {
  private readonly catalog: SimpleCatalogProto = {
    name: 'catalog',
  };

  private supported = true;
  private languageOptions: LanguageOptions | undefined;

  registeredTables: TableDefinition[] = [];
  private informationSchemaConfigurator = new InformationSchemaConfigurator();

  constructor(private dbtRepository: DbtRepository, private bigQueryClient: BigQueryClient) {}

  getClient(): ZetaSQLClient {
    return ZetaSQLClient.getInstance();
  }

  isSupported(): boolean {
    return this.supported;
  }

  isTableRegistered(table: TableDefinition): boolean {
    return this.registeredTables.some(t => arraysAreEqual(t.namePath, table.namePath) && t.rawName === table.rawName);
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
        parent = NewZetaSqlWrapper.addChildCatalog(this.catalog, projectId);
      }

      const dataSetName = table.getDataSetName();
      if (dataSetName) {
        parent = NewZetaSqlWrapper.addChildCatalog(parent, dataSetName);
      }
    }

    if (table.containsInformationSchema()) {
      this.informationSchemaConfigurator.fillInformationSchema2(table, parent);
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
        NewZetaSqlWrapper.addColumn(existingTable, newColumn);
      }

      if (table.timePartitioning) {
        NewZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_TIME, 'timestamp');
        NewZetaSqlWrapper.addPartitioningColumn(existingTable, ZetaSqlWrapper.PARTITION_DATE, 'date');
      }
    }
  }

  static addPartitioningColumn(existingTable: SimpleTableProto, name: string, type: string): void {
    NewZetaSqlWrapper.addColumn(existingTable, NewZetaSqlWrapper.createSimpleColumn(name, NewZetaSqlWrapper.createType({ name, type })));
  }

  static addColumn(table: SimpleTableProto, newColumn: SimpleColumnProto): void {
    const column = table.column?.find(c => c.name === newColumn.name);
    if (!column) {
      table.column = table.column ?? [];
      table.column.push(newColumn);
    }
  }

  // TODO refactor
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
      console.log(`Cannot find SimpleType for ${newColumn.type}`); // TODO: fix all these issues
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
    const model = this.dbtRepository.models.find(m => m.originalFilePath === originalFilePath);
    if (!model) {
      console.log(`Model ${originalFilePath} not found`);
      return err('Model not found');
    }
    const compiledSql = sql ?? this.getCompiledSql(model);
    if (!compiledSql) {
      return err('Compiled SQL not found');
    }
    await this.registerAllLanguageFeatures(this.catalog);

    const tables = await this.findTableNames(compiledSql);

    for (const table of tables) {
      if (!this.isTableRegistered(table)) {
        if (!(await this.updateTableSchema(table))) {
          const ref = this.getTableRef(model, table.getTableName());
          if (ref) {
            const uniqueId = model.dependsOn.nodes.find(n => n.endsWith(ref.join('.')));
            const refModel = this.dbtRepository.models.find(m => m.uniqueId === uniqueId);
            if (refModel) {
              const analyzeResult = await this.analyzeTable(refModel.originalFilePath);
              if (analyzeResult.isOk()) {
                table.columns = analyzeResult.value.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList
                  .filter(c => c.column !== null)
                  .map(c => {
                    return NewZetaSqlWrapper.createSimpleColumn(c.name, c.column?.type ?? null);
                  });
              }
            } else {
              console.log(`Can't find ref model`);
            }
          } else {
            console.log(`Can't find ref`);
          }
        }
        this.registerTable(table);
      }
    }
    console.log(`Analyze ${originalFilePath}`); // TODO: delete
    return this.getAstOrError(compiledSql);
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
      console.log('AST was successfully received');
      return ok(ast);
    } catch (e) {
      console.log(`There was an error wile parsing SQL query: ${String((e as Partial<Record<string, string>>)['details'])}`); // TODO delete
      return err((e as Partial<Record<string, string>>)['details'] ?? 'Unknown parser error [at 0:0]');
    }
  }

  getCompiledSql(model: ManifestModel): string | undefined {
    const compiledPath = path.resolve(this.dbtRepository.dbtTargetPath, 'compiled', model.packageName, model.originalFilePath);
    try {
      return fs.readFileSync(compiledPath, 'utf8');
    } catch (e) {
      console.log(`Cannot read ${compiledPath}`);
      return undefined; // For some reason compiled file not found
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
          NewZetaSqlWrapper.createSimpleColumn(f.name, NewZetaSqlWrapper.createType(f)),
        );
        table.timePartitioning = metadata.timePartitioning;
        return true;
      }
      console.log(`metadata not found for table ${tableName}`); // TODO delete
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
}
