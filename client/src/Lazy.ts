export class Lazy<T> {
  private initialized = false;
  private value?: T;

  constructor(private readonly getValue: () => T) {}

  get(): T {
    if (!this.initialized) {
      this.initialized = true;
      this.value = this.getValue();
    }

    return this.value as T;
  }
}
