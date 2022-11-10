import { EventEmitter } from 'node:events';
import { StatusHandler } from './status/StatusHandler';

export interface ExtensionApi {
  manifestParsedEventEmitter: EventEmitter;
  statusHandler: StatusHandler;
}

export const LS_MANIFEST_PARSED_EVENT = 'manifestParsedEvent';
