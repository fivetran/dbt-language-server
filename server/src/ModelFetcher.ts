import * as retry from 'async-retry';
import { DbtRepository } from './DbtRepository';
import { ManifestModel } from './manifest/ManifestJson';
import path = require('node:path');

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
            const model = this.dbtRepository.models.find(m => pathEqual(path.join(m.rootPath, m.originalFilePath), this.fullModelPath));
            if (model === undefined) {
              console.log('Model not found in manifest.json, retrying...');
              throw new Error('Model not found in manifest.json');
            }

            return model;
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
