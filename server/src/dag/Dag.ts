import { DagNode } from './DagNode';

export class Dag {
  constructor(public readonly nodes: DagNode[]) {}

  public getRootNodes(): DagNode[] {
    return this.nodes.filter(n => n.parents.size === 0);
  }
}
