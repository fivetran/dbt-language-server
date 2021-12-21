export abstract class Command {
  constructor(private name: string, private parameters: string[], private pathToPythonMain: string, private python?: string, private env?: string) {}

  toString(): string {
    return this.python ? this.getPython() : this.getGlobal();
  }

  addParameter(parameter: string): void {
    this.parameters.push(parameter);
  }

  private getGlobal(): string {
    return `${this.env ?? ''} ${this.name} ${this.parameters.join(' ')}`;
  }

  private getPython(): string {
    const quotedParameters = this.parameters.map(p => `"${p}"`).toString();
    return `${this.env ?? ''} ${this.python} -c 'import ${this.pathToPythonMain}; ${this.pathToPythonMain}.main([${quotedParameters}])'`;
  }
}
