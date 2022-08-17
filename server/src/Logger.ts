import path = require('path');

export enum LogLevel {
  Debug = '__LogLevelDebug',
}

export class Logger {
  static prepareLogger(workspaceFolder: string): void {
    const id = workspaceFolder.substring(workspaceFolder.lastIndexOf(path.sep) + 1);

    const old = console.log;
    console.log = (...args): void => {
      const count = Array.prototype.unshift.call(args, `${id} ${new Date().toISOString()}: `);
      if (count >= 3 && args[2] === LogLevel.Debug) {
        if (process.env['DBT_LS_ENABLE_DEBUG_LOGS'] === 'true') {
          args.splice(2, 1);
        } else {
          return;
        }
      }
      old.apply(console, args);
    };
  }
}
