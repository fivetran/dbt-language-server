import { ManifestMacro, ManifestModel, ManifestSource } from '../manifest/ManifestJson';

export class DbtRepository {
  manifestExists = false;
  dbtTargetPath?: string;
  projectName?: string;
  models: ManifestModel[] = [];
  macros: ManifestMacro[] = [];
  sources: ManifestSource[] = [];
}
