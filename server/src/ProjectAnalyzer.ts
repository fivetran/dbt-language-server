import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { err, Result } from 'neverthrow';
import { BigQueryClient } from './bigquery/BigQueryClient';
import { BigQueryTableFetcher } from './BigQueryTableFetcher';
import { DagNode } from './dag/DagNode';
import { DbtRepository } from './DbtRepository';
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
    const visitedModels = new Map<string, Promise<Result<AnalyzeResponse__Output, string>>>();

    await ProjectAnalyzer.walkRootToLeafBreadthFirst(this.dbtRepository.dag.getRootNodes(), async node => {
      const model = node.getValue();
      if (model.packageName === this.projectName) {
        results.push({ modelUniqueId: model.uniqueId, astResult: await this.analyzeModel(model, bigQueryTableFetcher, undefined, visitedModels) });
      }
    });
    console.log('Project analysis completed');
    return results;
  }

  static async walkRootToLeafBreadthFirst(startNodes: DagNode[], action: (node: DagNode) => Promise<void>): Promise<void> {
    const visited = new Set<string>();
    let queue = startNodes;

    while (queue.length > 0) {
      const currentLevel = queue;
      queue = [];

      const promises = currentLevel.map(async node => {
        const id = node.getValue().uniqueId;
        if (visited.has(id)) {
          return;
        }
        visited.add(id);
        await action(node);

        for (const child of node.children) {
          if (!visited.has(child.getValue().uniqueId)) {
            queue.push(child);
          }
        }
      });

      await Promise.all(promises);
    }
  }

  /** Analyzes a single model and all models that depend on it */
  async analyzeModelTree(node: DagNode, sql: string): Promise<ModelsAnalyzeResult[]> {
    const tableFetcher = new BigQueryTableFetcher(this.bigQueryClient);
    return this.analyzeModelTreeInternal(node, tableFetcher, sql, new Map());
  }

  async analyzeSql(sql: string): Promise<Result<AnalyzeResponse__Output, string>> {
    return this.analyzeModel(undefined, new BigQueryTableFetcher(this.bigQueryClient), sql, new Map());
  }

  dispose(): void {
    this.zetaSqlWrapper
      .terminateServer()
      .catch(e => console.log(`Failed to terminate zetasql server: ${e instanceof Error ? e.message : String(e)}`));
  }

  private async analyzeModelTreeInternal(
    node: DagNode,
    tableFetcher: BigQueryTableFetcher,
    sql: string | undefined,
    visitedModels: Map<string, Promise<Result<AnalyzeResponse__Output, string>>>,
  ): Promise<ModelsAnalyzeResult[]> {
    const model = node.getValue();
    const astResult = await this.analyzeModel(model, tableFetcher, sql, visitedModels);
    let results: ModelsAnalyzeResult[] = [{ modelUniqueId: model.uniqueId, astResult }];

    if (astResult.isErr()) {
      // We don't analyze models that depend on this model because they all will have errors
      return results;
    }

    // If main model is OK we analyze all models that depend on it
    const children = node.getChildren();
    for (const child of children) {
      results = [...results, ...(await this.analyzeModelTreeInternal(child, tableFetcher, undefined, visitedModels))];
    }
    return results;
  }

  private async analyzeModel(
    model: ManifestModel | undefined,
    tableFetcher: BigQueryTableFetcher,
    sql: string | undefined,
    visitedModels: Map<string, Promise<Result<AnalyzeResponse__Output, string>>>,
  ): Promise<Result<AnalyzeResponse__Output, string>> {
    await this.zetaSqlWrapper.registerAllLanguageFeatures();
    const upstreamError: ModelError = {};
    const result = await this.analyzeModelCached(model, tableFetcher, upstreamError, sql, visitedModels);
    if (
      upstreamError.path !== undefined &&
      upstreamError.error !== undefined &&
      (!model || upstreamError.path !== this.dbtRepository.getModelRawSqlPath(model))
    ) {
      console.log(`Upstream error in file ${upstreamError.path}: ${upstreamError.error}`);
    }
    return result;
  }

  private analyzeModelCached(
    model: ManifestModel | undefined,
    bigQueryTableFetcher: BigQueryTableFetcher,
    upstreamError: ModelError,
    sql: string | undefined,
    visitedModels: Map<string, Promise<Result<AnalyzeResponse__Output, string>>>,
  ): Promise<Result<AnalyzeResponse__Output, string>> {
    const cacheKey = model?.uniqueId;
    let promise = cacheKey ? visitedModels.get(cacheKey) : undefined;
    if (!promise) {
      promise = this.analyzeModelInternal(model, bigQueryTableFetcher, upstreamError, sql, visitedModels);
      if (cacheKey) {
        visitedModels.set(cacheKey, promise);
      }
    }
    return promise;
  }

  private async analyzeModelInternal(
    model: ManifestModel | undefined,
    bigQueryTableFetcher: BigQueryTableFetcher,
    upstreamError: ModelError,
    sql: string | undefined,
    visitedModels: Map<string, Promise<Result<AnalyzeResponse__Output, string>>>,
  ): Promise<Result<AnalyzeResponse__Output, string>> {
    const compiledSql = sql ?? this.getCompiledCode(model);
    if (compiledSql === undefined) {
      return err(`Compiled SQL not found for model ${model?.uniqueId ?? 'undefined'}`);
    }

    const tables = await this.zetaSqlWrapper.findTableNames(compiledSql);
    if (tables.length > 0) {
      await this.analyzeAllEphemeralModels(model, bigQueryTableFetcher, upstreamError, visitedModels);
    }

    for (const table of tables) {
      if (!this.zetaSqlWrapper.isTableRegistered(table)) {
        const refId = this.getTableRefUniqueId(model, table.getTableName());
        if (refId) {
          const refModel = this.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === refId)?.getValue();
          if (refModel) {
            await this.analyzeModelCached(refModel, bigQueryTableFetcher, upstreamError, undefined, visitedModels);
          } else {
            console.log("Can't find ref model by id");
          }
        } else {
          // We are dealing with a source here, probably
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
    visitedModels: Map<string, Promise<Result<AnalyzeResponse__Output, string>>>,
  ): Promise<void> {
    for (const node of model?.dependsOn.nodes ?? []) {
      const dependsOnEphemeralModel = this.dbtRepository.dag.nodes
        .find(n => n.getValue().uniqueId === node && n.getValue().config?.materialized === 'ephemeral')
        ?.getValue();
      if (dependsOnEphemeralModel) {
        const table = ProjectAnalyzer.createTableDefinition(dependsOnEphemeralModel);
        if (!this.zetaSqlWrapper.isTableRegistered(table)) {
          await this.analyzeModelCached(dependsOnEphemeralModel, bigQueryTableFetcher, upstreamError, undefined, visitedModels);
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
