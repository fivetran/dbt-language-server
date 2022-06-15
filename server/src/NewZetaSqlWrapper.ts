import { TypeFactory, TypeKind, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { LanguageVersion } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageVersion';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ResolvedOutputColumnProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { SimpleCatalogProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleCatalogProto';
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
    return this.registeredTables.some(t => this.arraysAreEqual(t.namePath, table.namePath) && t.rawName === table.rawName);
  }

  isTableRef(model: ManifestModel, name: string): boolean {
    for (const ref of model.refs) {
      if (ref.includes(name)) {
        // TODO
        return true;
      }
    }
    return false;
  }

  getTableRef(model: ManifestModel, name: string): string[] | undefined {
    for (const ref of model.refs) {
      if (ref.includes(name)) {
        // TODO
        return ref;
      }
    }
    return undefined;
  }

  registerTable(table: TableDefinition): void {
    this.registeredTables.push(table);

    let parent = this.catalog;

    if (!table.rawName) {
      const projectId = table.getProjectName();
      if (projectId) {
        let projectCatalog = this.catalog.catalog?.find(c => c.name === projectId);
        if (!projectCatalog) {
          projectCatalog = {
            name: projectId,
          };
          if (!this.catalog.catalog) {
            this.catalog.catalog = [];
          }
          this.catalog.catalog.push(projectCatalog);
        }
        parent = projectCatalog;
      }

      const dataSetName = table.getDataSetName();
      if (dataSetName) {
        let dataSetCatalog = parent.catalog?.find(c => c.name === dataSetName);
        if (!dataSetCatalog) {
          dataSetCatalog = {
            name: dataSetName,
          };
          if (!parent.catalog) {
            parent.catalog = [];
          }
          parent.catalog.push(dataSetCatalog);
        }
        parent = dataSetCatalog;
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
        if (!parent.table) {
          parent.table = [];
        }
        parent.table.push(existingTable);
      }

      // TODO
      if (table.schema) {
        for (const newColumn of table.schema.fields) {
          NewZetaSqlWrapper.addColumn(existingTable, newColumn);
        }
      } else if (table.columns) {
        for (const newColumn of table.columns) {
          NewZetaSqlWrapper.addPreparedColumn(existingTable, newColumn);
        }
      }

      if (table.timePartitioning) {
        NewZetaSqlWrapper.addColumn(existingTable, { name: ZetaSqlWrapper.PARTITION_TIME, type: 'timestamp' });
        NewZetaSqlWrapper.addColumn(existingTable, { name: ZetaSqlWrapper.PARTITION_DATE, type: 'date' });
      }
    }
  }

  static addColumn(table: SimpleTableProto, newColumn: ColumnDefinition): void {
    NewZetaSqlWrapper.addColumnWithType(table, newColumn.name, NewZetaSqlWrapper.createType(newColumn));
  }

  static addPreparedColumn(table: SimpleTableProto, newColumn: ResolvedOutputColumnProto__Output): void {
    NewZetaSqlWrapper.addColumnWithType(table, newColumn.name, newColumn.column?.type);
  }

  static addColumnWithType(table: SimpleTableProto, name: string, type?: TypeProto | null): void {
    let column = table.column?.find(c => c.name === name);
    if (!column) {
      column = {
        name,
        type,
      };
      table.column = table.column ?? [];
      table.column.push(column);
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

    const tables = await this.findTableNames(compiledSql);

    await this.registerAllLanguageFeatures(this.catalog);
    for (const table of tables) {
      if (!this.isTableRegistered(table)) {
        // check table.getTableName()
        const ref = this.getTableRef(model, table.getTableName());
        if (ref) {
          const uniqueId = model.dependsOn.nodes.find(n => n.endsWith(ref.join('.')));
          const refModel = this.dbtRepository.models.find(m => m.uniqueId === uniqueId);
          if (refModel) {
            const analyzeResult = await this.analyzeTable(refModel.originalFilePath);
            if (analyzeResult.isOk()) {
              table.columns = analyzeResult.value.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList;
            }
          } else {
            // TODO
          }
        } else {
          await this.updateTableSchema(table);
        }
        this.registerTable(table);
      }
    }
    return this.getAstOrError(compiledSql);
  }

  // TODO rename
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

  async getAstOrError(compiledSql: string): Promise<Result<AnalyzeResponse__Output, string>> {
    try {
      const ast = await this.analyze(compiledSql, this.catalog);
      console.log('AST was successfully received');
      return ok(ast);
    } catch (e) {
      console.log('There was an error wile parsing SQL query');
      return err((e as Partial<Record<string, string>>)['details'] ?? 'Unknown parser error [at 0:0]');
    }
  }

  getCompiledSql(model: ManifestModel): string {
    const compiledPath = path.resolve(this.dbtRepository.dbtTargetPath, 'compiled', model.packageName, model.originalFilePath);
    return fs.readFileSync(compiledPath, 'utf8'); // TODO try catch?
  }

  async updateTableSchema(table: TableDefinition): Promise<void> {
    if (!table.containsInformationSchema()) {
      const dataSetName = table.getDataSetName();
      const tableName = table.getTableName();

      if (dataSetName && tableName) {
        const metadata = await this.bigQueryClient.getTableMetadata(dataSetName, tableName);
        if (metadata) {
          table.schema = metadata.schema;
          table.timePartitioning = metadata.timePartitioning;
        } else {
          console.log(`metadata not found for table ${tableName}`); // TODO delete
        }
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

  // TODO
  arraysAreEqual(a1: string[], a2: string[]): boolean {
    return a1.length === a2.length && a1.every((value, index) => value === a2[index]);
  }
}
