import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { err, Result } from 'neverthrow';
import { DagNode } from './dag/DagNode';
import { DbtDestinationClient } from './DbtDestinationClient';
import { DbtRepository } from './DbtRepository';
import { ManifestModel } from './manifest/ManifestJson';
import { TableDefinition } from './TableDefinition';
import { TableFetcher } from './TableFetcher';
import { getTableRefUniqueId } from './utils/ManifestUtils';
import { ParseResult } from './ZetaSqlParser';
import { ZetaSqlWrapper } from './ZetaSqlWrapper';

export type ModelsAnalyzeResult = {
  modelUniqueId: string;
  analyzeResult: AnalyzeResult;
};

export interface AnalyzeResult {
  ast: Result<AnalyzeResponse__Output, string>;
  parseResult: ParseResult;
}

export type AnalyzeTrackerFunc = (completedCount: number, modelsCount: number) => void;

export class ProjectAnalyzer {
  constructor(
    private dbtRepository: DbtRepository,
    private projectName: string,
    private destinationClient: DbtDestinationClient,
    private zetaSqlWrapper: ZetaSqlWrapper,
  ) {}

  async initialize(): Promise<void> {
    await this.zetaSqlWrapper.initializeZetaSql();
  }

  /** Analyzes models from project starting from the roots and stopping if there is error in node */
  async analyzeProject(analyzeTracker: AnalyzeTrackerFunc): Promise<ModelsAnalyzeResult[]> {
    console.log('Project analysis started...');

    this.zetaSqlWrapper.resetCatalog();

    const visited = new Set<string>();
    let queue = this.dbtRepository.dag.getRootNodes(this.projectName);
    const modelCount = this.dbtRepository.dag.getNodesCount(this.projectName);

    const results: ModelsAnalyzeResult[] = [];
    const tableFetcher = new TableFetcher(this.destinationClient);
    const visitedModels = new Map<string, Promise<AnalyzeResult>>();
    analyzeTracker(visited.size, modelCount);

    while (queue.length > 0) {
      const currentLevel = queue;
      queue = [];

      const promises = currentLevel.map(async node => {
        const id = node.getValue().uniqueId;
        if (visited.has(id)) {
          return;
        }
        visited.add(id);

        const model = node.getValue();
        const analyzeResult = await this.analyzeModelCached(model, tableFetcher, undefined, visitedModels);
        results.push({ modelUniqueId: model.uniqueId, analyzeResult });
        for (const child of node.children) {
          if (!visited.has(child.getValue().uniqueId)) {
            queue.push(child);
          }
        }
      });

      await Promise.all(promises);
      analyzeTracker(visited.size, modelCount);
    }

    console.log('Project analysis completed');
    return this.filterErrorResults(results);
  }

  /** Filters all errors. Returns only root errors */
  private filterErrorResults(results: ModelsAnalyzeResult[]): ModelsAnalyzeResult[] {
    const errorResults = results.filter(r => r.analyzeResult.ast.isErr());
    const idToExclude = new Set(
      errorResults
        .filter(r => {
          const current = this.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === r.modelUniqueId);
          return current?.findParent(p => errorResults.some(er => er.modelUniqueId === p.getValue().uniqueId));
        })
        .map(r => r.modelUniqueId),
    );
    return results.filter(r => !idToExclude.has(r.modelUniqueId));
  }

  /** Analyzes a single model and all models that depend on it */
  async analyzeModelTree(node: DagNode, sql: string): Promise<ModelsAnalyzeResult[]> {
    const tableFetcher = new TableFetcher(this.destinationClient);
    return this.analyzeModelTreeInternal(node, tableFetcher, sql, new Map());
  }

  async analyzeSql(sql: string): Promise<AnalyzeResult> {
    return this.analyzeModelCached(undefined, new TableFetcher(this.destinationClient), sql, new Map());
  }

  dispose(): void {
    this.zetaSqlWrapper.terminateServer();
  }

  private async analyzeModelTreeInternal(
    node: DagNode,
    tableFetcher: TableFetcher,
    sql: string | undefined,
    visitedModels: Map<string, Promise<AnalyzeResult>>,
  ): Promise<ModelsAnalyzeResult[]> {
    const model = node.getValue();
    const analyzeResult = await this.analyzeModelCached(model, tableFetcher, sql, visitedModels);
    return [{ modelUniqueId: model.uniqueId, analyzeResult }];

    /* TODO: Uncomment when we will be able to analyze all models or part of models in the tree
    let results: ModelsAnalyzeResult[] = [{ modelUniqueId: model.uniqueId, analyzeResult }];

    if (analyzeResult.isErr()) {
      // We don't analyze models that depend on this model because they all will have errors
      return results;
    }

    // If main model is OK we analyze it's first level children
    const children = node.getChildren();
    for (const child of children) {
      console.log('ANALYZE CHILD ' + child.getValue().uniqueId);
      const childModel = child.getValue();
      const childResult = await this.analyzeModelCached(childModel, tableFetcher, undefined, visitedModels);
      results = [...results, { modelUniqueId: childModel.uniqueId, analyzeResult: childResult }];
    }
    return results;
    */
  }

  private async analyzeModelCached(
    model: ManifestModel | undefined,
    tableFetcher: TableFetcher,
    sql: string | undefined,
    visitedModels: Map<string, Promise<AnalyzeResult>>,
  ): Promise<AnalyzeResult> {
    await this.zetaSqlWrapper.registerAllLanguageFeatures();
    const cacheKey = model?.uniqueId;
    let promise = cacheKey ? visitedModels.get(cacheKey) : undefined;
    if (!promise) {
      promise = this.analyzeModelInternal(model, tableFetcher, sql, visitedModels);
      if (cacheKey) {
        visitedModels.set(cacheKey, promise);
      }
    }
    return promise;
  }

  private async analyzeModelInternal(
    model: ManifestModel | undefined,
    tableFetcher: TableFetcher,
    sql: string | undefined,
    visitedModels: Map<string, Promise<AnalyzeResult>>,
  ): Promise<AnalyzeResult> {
    const compiledSql = sql ?? this.getCompiledCode(model);
    if (compiledSql === undefined) {
      return {
        ast: err(`Compiled SQL not found for model ${model?.uniqueId ?? 'undefined'}`),
        parseResult: {
          functions: [],
          selects: [],
        },
      };
    }

    const tables = await this.zetaSqlWrapper.findTableNames(compiledSql);
    if (tables.length > 0) {
      await this.analyzeAllEphemeralModels(model, tableFetcher, visitedModels);
    }

    for (const table of tables) {
      if (!this.zetaSqlWrapper.isTableRegistered(table)) {
        const refId = getTableRefUniqueId(model, table.getTableName(), this.dbtRepository);
        if (refId) {
          const refModel = this.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === refId)?.getValue();
          if (refModel) {
            await this.analyzeModelCached(refModel, tableFetcher, undefined, visitedModels);
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
          tableFetcher.fetchTable(t).then(ts => {
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

    const parseResult = await this.zetaSqlWrapper.getParseResult(compiledSql);
    await this.zetaSqlWrapper.registerPersistentUdfs(parseResult);
    const tempUdfs = await this.zetaSqlWrapper.getTempUdfs(model?.config?.sqlHeader);
    const catalogWithTempUdfs = this.zetaSqlWrapper.createCatalogWithTempUdfs(tempUdfs);

    const ast = await this.zetaSqlWrapper.getAstOrError(compiledSql, catalogWithTempUdfs);
    if (ast.isOk() && model) {
      const table = ProjectAnalyzer.createTableDefinition(model);
      this.fillTableWithAnalyzeResponse(table, ast.value);
      this.zetaSqlWrapper.registerTable(table);
    }

    return {
      ast,
      parseResult,
    };
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
    tableFetcher: TableFetcher,
    visitedModels: Map<string, Promise<AnalyzeResult>>,
  ): Promise<void> {
    for (const node of model?.dependsOn.nodes ?? []) {
      const dependsOnEphemeralModel = this.dbtRepository.dag.nodes
        .find(n => n.getValue().uniqueId === node && n.getValue().config?.materialized === 'ephemeral')
        ?.getValue();
      if (dependsOnEphemeralModel) {
        const table = ProjectAnalyzer.createTableDefinition(dependsOnEphemeralModel);
        if (!this.zetaSqlWrapper.isTableRegistered(table)) {
          await this.analyzeModelCached(dependsOnEphemeralModel, tableFetcher, undefined, visitedModels);
        }
      }
    }
  }

  private getCompiledCode(model?: ManifestModel): string | undefined {
    return model ? this.dbtRepository.getModelCompiledCode(model) : undefined;
  }
}
