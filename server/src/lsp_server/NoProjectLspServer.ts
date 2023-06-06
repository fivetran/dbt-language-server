import { InitializeError, InitializeResult, ResponseError, _Connection } from 'vscode-languageserver';
import { NotificationSender } from '../NotificationSender';
import { NoProjectFeatureFinder } from '../feature_finder/NoProjectFeatureFinder';
import { NoProjectStatusSender } from '../status_bar/NoProjectStatusSender';
import { LspServerBase } from './LspServerBase';

export class NoProjectLspServer extends LspServerBase<NoProjectFeatureFinder> {
  statusSender: NoProjectStatusSender;

  constructor(connection: _Connection, notificationSender: NotificationSender, featureFinder: NoProjectFeatureFinder) {
    super(connection, notificationSender, featureFinder);
    this.statusSender = new NoProjectStatusSender(this.notificationSender, this.featureFinder);
  }

  onInitialize(): InitializeResult<unknown> | ResponseError<InitializeError> {
    console.log('Starting server without project');

    this.connection.onInitialized(this.onInitialized.bind(this));
    this.initializeNotifications();

    process.on('uncaughtException', this.onUncaughtException.bind(this));

    return { capabilities: {} };
  }

  async onInitialized(): Promise<void> {
    await this.featureFinder.availableDbtPromise;
    this.statusSender.sendStatus();
  }
}
