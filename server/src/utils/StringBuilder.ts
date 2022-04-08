export class StringBuilder {
  private strings: string[];

  constructor() {
    this.strings = [];
  }

  public append(text: string): StringBuilder {
    this.strings.push(text);
    return this;
  }

  public appendIf(condition: boolean, text: string): StringBuilder {
    if (condition) {
      this.strings.push(text);
    }
    return this;
  }

  public toString(): string {
    return this.strings.join('');
  }

  public clear(): void {
    this.strings = [];
  }
}
