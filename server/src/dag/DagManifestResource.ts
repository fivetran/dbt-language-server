import { ManifestModel } from '../manifest/ManifestJson';

export class DagManifestResource {
  constructor(public readonly node: ManifestModel) {}
}
