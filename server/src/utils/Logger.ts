import * as fs from 'fs';

enum LogEventType {
  DEBUG = 'Debug',
  INFO = 'Info',
  WARNING = 'Warning',
  ERROR = 'Error',
}

export class Logger {
  private static LOGS_FILE_PATH = './logs/';

  private name: string;

  constructor(name: string) {
    this.name = name;
  }

  debug(message: string): void {
    this.log(LogEventType.DEBUG, message);
  }

  info(message: string): void {
    this.log(LogEventType.INFO, message);
  }

  warning(message: string): void {
    this.log(LogEventType.WARNING, message);
  }

  error(message: string): void {
    this.log(LogEventType.ERROR, message);
  }

  private log(type: LogEventType, message: string): void {
    try {
      const localNow = new Date().toLocaleString();
      const logMessage = `${localNow}: (${type}) ${message}\n`;

      fs.appendFile(Logger.LOGS_FILE_PATH + this.name, logMessage, err => {
        if (err) {
          throw err;
        }
      });
    } catch (e) {
      console.log('Unable to append data to log.');
    }
  }
}
