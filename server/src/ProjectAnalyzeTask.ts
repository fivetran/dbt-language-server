import { AnalyzeResult, ModelsAnalyzeResult, ProjectAnalyzer } from './ProjectAnalyzer';

export type AnalyzeTrackerFunc = (completedCount: number, modelsCount: number) => void;

export class ProjectAnalyzeTask {
  private stopRequested = false;
  private abortController = new AbortController();

  constructor(
    private projectAnalyzer: ProjectAnalyzer,
    private projectName: string,
    private analyzeTracker: AnalyzeTrackerFunc,
  ) {}

  /** Analyzes models from project starting from the roots and stopping if there is error in node */
  async start(): Promise<ModelsAnalyzeResult[]> {
    console.log('Project analysis started...');

    const visited = new Set<string>();
    let queue = this.projectAnalyzer.dbtRepository.dag.getRootNodes(this.projectName);
    const modelCount = this.projectAnalyzer.dbtRepository.dag.getNodesCount(this.projectName);

    const results: ModelsAnalyzeResult[] = [];
    const visitedModels = new Map<string, Promise<AnalyzeResult>>();
    this.analyzeTracker(visited.size, modelCount);

    while (queue.length > 0) {
      const currentLevel = queue;
      queue = [];

      const promises = currentLevel.map(async node => {
        const id = node.getValue().uniqueId;
        if (visited.has(id)) {
          return;
        }
        visited.add(id);

        const analyzeResults = await this.projectAnalyzer.analyzeModelTreeInternal(node, undefined, visitedModels, this.abortController.signal);
        results.push(...analyzeResults);

        for (const child of node.children) {
          if (!visited.has(child.getValue().uniqueId)) {
            queue.push(child);
          }
        }
      });

      await Promise.all(promises);
      if (this.stopRequested) {
        throw new Error('Canceled');
      }
      this.analyzeTracker(visited.size, modelCount);
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
          const current = this.projectAnalyzer.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === r.modelUniqueId);
          return current?.findParent(p => errorResults.some(er => er.modelUniqueId === p.getValue().uniqueId));
        })
        .map(r => r.modelUniqueId),
    );
    return results.filter(r => !idToExclude.has(r.modelUniqueId));
  }

  stop(): void {
    this.stopRequested = true;
    this.abortController.abort();
  }
}
