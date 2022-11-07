import { InitializeError, InitializeResult, ResponseError, _Connection } from 'vscode-languageserver';
import { FeatureFinder } from './FeatureFinder';
import { NoProjectStatusSender } from './NoProjectStatusSender';
import { NotificationSender } from './NotificationSender';

export class NoProjectLspServer {
  notificationSender: NotificationSender;
  statusSender: NoProjectStatusSender;

  constructor(private connection: _Connection, private featureFinder: FeatureFinder) {
    this.notificationSender = new NotificationSender(this.connection);
    this.statusSender = new NoProjectStatusSender(this.notificationSender, this.featureFinder);
  }

  onInitialize(): InitializeResult<unknown> | ResponseError<InitializeError> {
    console.log('Starting server without project');

    this.connection.onInitialized(this.onInitialized.bind(this));

    process.on('uncaughtException', this.onUncaughtException.bind(this));

    return { capabilities: {} };
  }

  async onInitialized(): Promise<void> {
    await this.featureFinder.findDbtForNoProjectStatus();
    this.statusSender.sendStatus();
  }

  onUncaughtException(error: Error, _origin: 'uncaughtException' | 'unhandledRejection'): void {
    console.log(error.stack);

    this.notificationSender.sendTelemetry('error', {
      name: error.name,
      message: error.message,
      stack: error.stack ?? '',
    });

    throw new Error('Uncaught exception. Server will be restarted.');
  }
}
