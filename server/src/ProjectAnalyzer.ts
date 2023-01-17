import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { err, Result } from 'neverthrow';
import { BigQueryClient } from './bigquery/BigQueryClient';
import { BigQueryTableFetcher } from './BigQueryTableFetcher';
import { DagNode } from './dag/DagNode';
import { DbtRepository } from './DbtRepository';
import { LogLevel } from './Logger';
import { ManifestModel } from './manifest/ManifestJson';
import { TableDefinition } from './TableDefinition';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

interface ModelError {
  error?: string;
  path?: string;
}

export type ModelsAnalyzeResult = {
  modelUniqueId: string;
  astResult: Result<AnalyzeResponse__Output, string>;
};

export class ProjectAnalyzer {
  constructor(
    private dbtRepository: DbtRepository,
    private projectName: string | undefined,
    private bigQueryClient: BigQueryClient,
    private zetaSqlWrapper: ZetaSqlWrapper,
  ) {}

  async initialize(): Promise<void> {
    await this.zetaSqlWrapper.initializeZetaSql();
  }

  /** Analyzes all models from project */
  async analyzeProject(): Promise<ModelsAnalyzeResult[]> {
    console.log('Project analysis started...');
    const bigQueryTableFetcher = new BigQueryTableFetcher(this.bigQueryClient);
    const results: ModelsAnalyzeResult[] = [];
    this.zetaSqlWrapper.resetCatalog();
    for (const node of this.dbtRepository.dag.nodes) {
      const model = node.getValue();
      if (model.packageName === this.projectName) {
        results.push({ modelUniqueId: model.uniqueId, astResult: await this.analyzeModel(model, bigQueryTableFetcher) });
      }
    }
    console.log('Project analysis completed');
    return results;
  }

  /** Analyzes a single model and all models that depend on it */
  async analyzeModelTree(node: DagNode, sql: string): Promise<ModelsAnalyzeResult[]> {
    const tableFetcher = new BigQueryTableFetcher(this.bigQueryClient);
    return this.analyzeModelTreeInternal(node, tableFetcher, sql);
  }

  async analyzeSql(sql: string): Promise<Result<AnalyzeResponse__Output, string>> {
    return this.analyzeModel(undefined, new BigQueryTableFetcher(this.bigQueryClient), sql);
  }

  dispose(): void {
    this.zetaSqlWrapper
      .terminateServer()
      .catch(e => console.log(`Failed to terminate zetasql server: ${e instanceof Error ? e.message : String(e)}`));
  }

  private async analyzeModelTreeInternal(node: DagNode, tableFetcher: BigQueryTableFetcher, sql?: string): Promise<ModelsAnalyzeResult[]> {
    const model = node.getValue();
    const astResult = await this.analyzeModel(model, tableFetcher, sql);
    let results: ModelsAnalyzeResult[] = [{ modelUniqueId: model.uniqueId, astResult }];

    if (astResult.isErr()) {
      // We don't analyze models that depend on this model because they all will have errors
      return results;
    }

    // If main model is OK we analyze all models that depend on it
    const children = node.getChildren();
    for (const child of children) {
      results = [...results, ...(await this.analyzeModelTreeInternal(child, tableFetcher))];
    }
    return results;
  }

  private async analyzeModel(
    model: ManifestModel | undefined,
    tableFetcher: BigQueryTableFetcher,
    sql?: string,
  ): Promise<Result<AnalyzeResponse__Output, string>> {
    await this.zetaSqlWrapper.registerAllLanguageFeatures();
    const upstreamError: ModelError = {};
    const result = await this.analyzeModelInternal(model, tableFetcher, upstreamError, sql);
    if (
      upstreamError.path !== undefined &&
      upstreamError.error !== undefined &&
      (!model || upstreamError.path !== this.dbtRepository.getModelRawSqlPath(model))
    ) {
      console.log(`Upstream error in file ${upstreamError.path}: ${upstreamError.error}`);
    }
    return result;
  }

  private async analyzeModelInternal(
    model: ManifestModel | undefined,
    bigQueryTableFetcher: BigQueryTableFetcher,
    upstreamError: ModelError,
    sql?: string,
  ): Promise<Result<AnalyzeResponse__Output, string>> {
    const compiledSql = sql ?? this.getCompiledCode(model);
    if (compiledSql === undefined) {
      return err(`Compiled SQL not found for model ${model?.uniqueId ?? 'undefined'}`);
    }

    const tables = await this.zetaSqlWrapper.findTableNames(compiledSql);
    if (tables.length > 0) {
      await this.analyzeAllEphemeralModels(model, bigQueryTableFetcher, upstreamError);
    }

    for (const table of tables) {
      if (!this.zetaSqlWrapper.isTableRegistered(table)) {
        const refId = this.getTableRefUniqueId(model, table.getTableName());
        if (refId) {
          const refModel = this.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === refId)?.getValue();
          if (refModel) {
            await this.analyzeModelInternal(refModel, bigQueryTableFetcher, upstreamError);
          } else {
            console.log("Can't find ref model by id");
          }
        } else {
          // We are dealing with a source here, probably
          console.log(`Can't find refId for ${table.getFullName()}`, LogLevel.Debug);
        }
      }
    }

    const settledResult = await Promise.allSettled(
      tables
        .filter(t => !this.zetaSqlWrapper.isTableRegistered(t))
        .map(t =>
          bigQueryTableFetcher.fetchTable(t).then(ts => {
            if (ts) {
              t.columns = ts.columns;
              t.timePartitioning = ts.timePartitioning;
            }
            return t;
          }),
        ),
    );
    settledResult
      .filter((v): v is PromiseFulfilledResult<TableDefinition> => v.status === 'fulfilled')
      .forEach(v => {
        if (v.value.schemaIsFilled()) {
          this.zetaSqlWrapper.registerTable(v.value);
        }
      });

    await this.zetaSqlWrapper.registerPersistentUdfs(compiledSql);
    const tempUdfs = await this.zetaSqlWrapper.getTempUdfs(model?.config?.sqlHeader);
    const catalogWithTempUdfs = this.zetaSqlWrapper.createCatalogWithTempUdfs(tempUdfs);

    const ast = await this.zetaSqlWrapper.getAstOrError(compiledSql, catalogWithTempUdfs);
    if (ast.isOk()) {
      if (model) {
        const table = ProjectAnalyzer.createTableDefinition(model);
        this.fillTableWithAnalyzeResponse(table, ast.value);
        this.zetaSqlWrapper.registerTable(table);
      }
    } else if (!upstreamError.error) {
      upstreamError.error = ast.error;
      if (model) {
        upstreamError.path = this.dbtRepository.getModelRawSqlPath(model);
      }
    }

    return ast;
  }

  private static createTableDefinition(model: ManifestModel): TableDefinition {
    return new TableDefinition([model.database, model.schema, model.alias ?? model.name]);
  }

  private fillTableWithAnalyzeResponse(table: TableDefinition, analyzeOutput: AnalyzeResponse__Output): void {
    table.columns = analyzeOutput.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList
      .filter(c => c.column !== null)
      .map(c => ZetaSqlWrapper.createSimpleColumn(c.name, c.column?.type ?? null));
  }

  private async analyzeAllEphemeralModels(
    model: ManifestModel | undefined,
    bigQueryTableFetcher: BigQueryTableFetcher,
    upstreamError: ModelError,
  ): Promise<void> {
    for (const node of model?.dependsOn.nodes ?? []) {
      const dependsOnEphemeralModel = this.dbtRepository.dag.nodes
        .find(n => n.getValue().uniqueId === node && n.getValue().config?.materialized === 'ephemeral')
        ?.getValue();
      if (dependsOnEphemeralModel) {
        const table = ProjectAnalyzer.createTableDefinition(dependsOnEphemeralModel);
        if (!this.zetaSqlWrapper.isTableRegistered(table)) {
          await this.analyzeModelInternal(dependsOnEphemeralModel, bigQueryTableFetcher, upstreamError);
        }
      }
    }
  }

  private getCompiledCode(model?: ManifestModel): string | undefined {
    return model ? this.dbtRepository.getModelCompiledCode(model) : undefined;
  }

  private getTableRefUniqueId(model: ManifestModel | undefined, name: string): string | undefined {
    if (!model || model.dependsOn.nodes.length === 0) {
      return undefined;
    }

    const refFullName = this.getTableRefFullName(model, name);

    if (refFullName) {
      const joinedName = refFullName.join('.');
      return model.dependsOn.nodes.find(n => n.endsWith(`.${joinedName}`));
    }

    return undefined;
  }

  private getTableRefFullName(model: ManifestModel, name: string): string[] | undefined {
    const refFullName = ProjectAnalyzer.findModelRef(model, name);
    if (refFullName) {
      return refFullName;
    }

    const aliasedModel = this.dbtRepository.dag.nodes.find(n => n.getValue().alias === name)?.getValue();
    if (aliasedModel && ProjectAnalyzer.findModelRef(model, aliasedModel.name)) {
      return [aliasedModel.name];
    }

    return undefined;
  }

  private static findModelRef(model: ManifestModel, name: string): string[] | undefined {
    return model.refs.find(ref => ref.indexOf(name) === ref.length - 1);
  }
}
