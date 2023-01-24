import { ManifestModel } from '../manifest/ManifestJson';
import { Dag } from './Dag';
import { DagNode } from './DagNode';

export class DagGenerator {
  generateDbtGraph(models: ManifestModel[]): Dag {
    const resources = models.map(m => new DagNode(m));

    DagGenerator.linkDbtResources(resources);
    return new Dag(resources);
  }

  private static linkDbtResources(resources: DagNode[]): void {
    const mapOfResources = new Map(resources.map(r => [r.getValue().uniqueId, r]));

    for (const resource of resources) {
      const node = resource.getValue();
      const parentNodes = node.dependsOn.nodes;
      for (const parentNode of parentNodes) {
        const parent = mapOfResources.get(parentNode);
        if (parent) {
          parent.addChild(resource);
        }
      }
    }
  }
}
