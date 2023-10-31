import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path = require('node:path');

export enum LogLevel {
  Debug = '__LogLevelDebug',
}

export const Logger = {
  prepareLogger(workspaceFolder: string, disableLogger?: boolean): void {
    if (disableLogger) {
      console.log = (): void => {
        // Do nothing
      };
      return;
    }

    const id = workspaceFolder.slice(workspaceFolder.lastIndexOf(path.sep) + 1);

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

      if (process.env['DBT_LS_ENABLE_DEBUG_LOGS'] === 'true') {
        Logger.writeToFile(args);
      }
      old.apply(console, args);
    };
  },

  writeToFile(args: [message?: unknown, ...optionalParams: unknown[]]): void {
    const folderPath = 'logs';
    if (!existsSync(folderPath)) {
      mkdirSync(folderPath, { recursive: true });
    }
    writeFileSync(path.join(folderPath, 'wizard.log'), `${args.join('')}\n`, {
      flag: 'a+',
    });
  },
};
