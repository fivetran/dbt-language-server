export interface DeferredResult<T> {
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  promise: Promise<T>;
}

export const deferred = <T>(): DeferredResult<T> => {
  let resolveFunc!: (value: T | PromiseLike<T>) => void;
  let rejectFunc!: (reason?: any) => void;

  const promise = new Promise<T>((resolve, reject) => {
    resolveFunc = resolve;
    rejectFunc = reject;
  });

  return {
    resolve: resolveFunc,
    reject: rejectFunc,
    promise,
  };
};
