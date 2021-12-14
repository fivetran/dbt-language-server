import { ProfileData } from '../../DbtProfile';

export class ServiceAccountData extends ProfileData {
  private _project: string;
  private _keyFilePath: string;

  constructor(project: string, keyFilePath: string) {
    super();
    this._project = project;
    this._keyFilePath = keyFilePath;
  }

  get project(): string {
    return this._project;
  }

  get keyFilePath(): string {
    return this._keyFilePath;
  }
}
