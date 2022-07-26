import EventEmitter = require('events');

export interface ExtensionApi {
  languageServerEventEmitter: EventEmitter;
}

export enum DebugEvent {
  LANGUAGE_SERVER_READY,
  DBT_SOURCE_CONTEXT_INITIALIZED,
  DIAGNOSTICS_SENT,
}
