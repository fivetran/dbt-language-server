import * as retry from 'async-retry';
import { DbtRepository } from './DbtRepository';
import { ManifestModel } from './manifest/ManifestJson';

export class ModelFetcher {
  model: ManifestModel | undefined;
  fetchCompleted = false;

  constructor(private dbtRepository: DbtRepository, public fullModelPath: string) {}

  /** We retry here because in some situations manifest.json can appear a bit later after compilation is finished */
  async getModel(): Promise<ManifestModel | undefined> {
    if (!this.fetchCompleted) {
      const { pathEqual } = await import('path-equal');
      try {
        this.model = await retry(
          () => {
            const node = this.dbtRepository.dag.nodes.find(n => pathEqual(this.dbtRepository.getModelRawSqlPath(n.getValue()), this.fullModelPath));
            if (node === undefined) {
              console.log('Model not found in manifest.json, retrying...');
              throw new Error('Model not found in manifest.json');
            }

            return node.getValue();
          },
          { factor: 1, retries: 3, minTimeout: 100 },
        );
      } catch {
        // Do nothing
      }
      this.fetchCompleted = true;
    }

    return this.model;
  }
}
