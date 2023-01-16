import { ManifestModel } from '../manifest/ManifestJson';

export class DagNode {
  parents = new Set<DagNode>();
  children = new Set<DagNode>();

  constructor(private value: ManifestModel) {}

  addChild(child: DagNode): void {
    this.children.add(child);
    child.parents.add(this);
  }

  getValue(): ManifestModel {
    return this.value;
  }
}
