import { EventEmitter } from 'node:events';

export interface ExtensionApi {
  manifestParsedEventEmitter: EventEmitter;
}

export const LS_MANIFEST_PARSED_EVENT = 'manifestParsedEvent';
