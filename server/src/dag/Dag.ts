import { DagNode } from './DagNode';

export class Dag {
  constructor(public readonly nodes: DagNode[]) {}

  getRootNodes(packageName: string): DagNode[] {
    return this.getNodesByPackage(packageName).filter(n => ![...n.parents].some(p => p.getValue().packageName === packageName));
  }

  getNodesCount(packageName: string): number {
    return this.getNodesByPackage(packageName).length;
  }

  getNodesByPackage(packageName: string): DagNode[] {
    return this.nodes.filter(n => n.getValue().packageName === packageName);
  }
}
