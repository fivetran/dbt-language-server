export class StringBuilder {
  private strings: string[];

  constructor() {
    this.strings = [];
  }

  public append(text: string): StringBuilder {
    this.strings.push(text);
    return this;
  }

  public prepend(text: string): StringBuilder {
    this.strings.unshift(text);
    return this;
  }

  public wrap(text: string): StringBuilder {
    this.prepend(text);
    this.append(text);
    return this;
  }

  public appendIf(condition: boolean, text: string): StringBuilder {
    if (condition) {
      this.strings.push(text);
    }
    return this;
  }

  public prependIf(condition: boolean, text: string): StringBuilder {
    if (condition) {
      this.strings.unshift(text);
    }
    return this;
  }

  public wrapIf(condition: boolean, text: string): StringBuilder {
    if (condition) {
      this.wrap(text);
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
