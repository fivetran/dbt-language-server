import { EventEmitter } from 'node:events';
import { QuickPick, QuickPickItem } from 'vscode';
import { StatusHandler } from './status/StatusHandler';

export interface ExtensionApi {
  manifestParsedEventEmitter: EventEmitter;
  statusHandler: StatusHandler;
  quickPick?: QuickPick<QuickPickItem>;
}

export const LS_MANIFEST_PARSED_EVENT = 'manifestParsedEvent';
