import { DbtCommandFactory } from '../DbtCommandFactory';

export abstract class Command {
  constructor(private name: string, profilesDir: string, private parameters: string[], public python?: string, public dbtLess1point5?: boolean) {
    if (!parameters.includes(DbtCommandFactory.VERSION_PARAM)) {
      parameters.unshift('--profiles-dir', profilesDir);
    }
  }

  toString(): string {
    return this.python ? this.getPython() : this.getGlobal();
  }

  addParameter(parameter: string): void {
    this.parameters.push(parameter);
  }

  private getGlobal(): string {
    return `${this.name} ${this.parameters.join(' ')}`;
  }

  private getPython(): string {
    const quotedParameters = this.parameters.map(p => `'${p}'`).toString();
    const code = this.dbtLess1point5 ? 'import dbt.main; dbt.main.main' : 'import dbt.cli.main; dbt.cli.main.cli';
    return `${String(this.python)} -c "${code}([${quotedParameters}])"`;
  }
}
