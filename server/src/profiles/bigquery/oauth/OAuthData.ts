import { ProfileData } from '../../ProfileData';

export class OAuthData extends ProfileData {
  private _project: string;

  constructor(project: string) {
    super();
    this._project = project;
  }

  get project(): string {
    return this._project;
  }
}
