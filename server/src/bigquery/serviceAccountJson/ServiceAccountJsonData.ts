import { ProfileData } from '../../DbtProfile';

export class ServiceAccountJsonData extends ProfileData {
  private _project: string;
  private _keyFileJson: string;

  constructor(project: string, keyFileJson: string) {
    super();
    this._project = project;
    this._keyFileJson = keyFileJson;
  }

  get project(): string {
    return this._project;
  }

  get keyFileJson(): string {
    return this._keyFileJson;
  }
}
