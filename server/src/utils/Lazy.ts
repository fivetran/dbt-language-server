export class Lazy<T> {
  private initialized = false;
  private value?: T;

  constructor(private readonly getValue: () => T) {}

  get(): T {
    if (!this.initialized) {
      this.initialized = true;
      this.value = this.getValue();
    }

    /* eslint-disable-next-line @typescript-eslint/no-non-null-assertion */
    return this.value!;
  }
}
