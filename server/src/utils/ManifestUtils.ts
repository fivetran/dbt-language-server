import { DbtRepository } from '../DbtRepository';
import { ManifestModel } from '../manifest/ManifestJson';

export function getTableRefUniqueId(model: ManifestModel | undefined, name: string, dbtRepository: DbtRepository): string | undefined {
  if (!model || model.dependsOn.nodes.length === 0) {
    return undefined;
  }

  const refFullName = getTableRefFullName(model, name, dbtRepository);

  if (refFullName) {
    const joinedName = refFullName.join('.');
    return model.dependsOn.nodes.find(n => n.endsWith(`.${joinedName}`));
  }

  return undefined;
}

function getTableRefFullName(model: ManifestModel, name: string, dbtRepository: DbtRepository): string[] | undefined {
  const refFullName = findModelRef(model, name);
  if (refFullName) {
    return refFullName;
  }

  const aliasedModel = dbtRepository.dag.nodes.find(n => n.getValue().alias === name)?.getValue();
  if (aliasedModel && findModelRef(model, aliasedModel.name)) {
    return [aliasedModel.name];
  }

  return undefined;
}

function findModelRef(model: ManifestModel, name: string): string[] | undefined {
  return model.refs.find(ref => ref.indexOf(name) === ref.length - 1);
}
