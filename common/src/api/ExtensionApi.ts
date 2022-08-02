import EventEmitter = require('events');

export interface ExtensionApi {
  languageServerEventEmitter: EventEmitter;
}

export enum DebugEvent {
  LANGUAGE_SERVER_READY,
}
