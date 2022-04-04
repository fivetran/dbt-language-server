declare function findFreePortPmfy(beg: any, ...rest: any): Promise<number>;
declare module 'find-free-port' {
  export = findFreePortPmfy;
}
