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

  getNodeByUri(uri: string): DagNode | undefined {
    return this.nodes.find(n => uri.endsWith(n.getValue().originalFilePath));
  }

  getNodeByName(name: string): DagNode | undefined {
    return this.nodes.find(n => n.getValue().name === name);
  }
}
