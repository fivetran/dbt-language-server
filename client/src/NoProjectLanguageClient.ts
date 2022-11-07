import { LspModeType, NO_PROJECT_PATH } from 'dbt-language-server-common';
import { Uri } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { DbtWizardLanguageClient } from './DbtWizardLanguageClient';
import { OutputChannelProvider } from './OutputChannelProvider';
import { StatusHandler } from './status/StatusHandler';

export class NoProjectLanguageClient extends DbtWizardLanguageClient {
  constructor(
    private port: number,
    private outputChannelProvider: OutputChannelProvider,
    statusHandler: StatusHandler,
    private serverAbsolutePath: string,
  ) {
    super(statusHandler, Uri.file(NO_PROJECT_PATH));
  }

  initializeClient(): LanguageClient {
    return new LanguageClient(
      NoProjectLanguageClient.CLIENT_ID,
      NoProjectLanguageClient.CLIENT_NAME,
      DbtWizardLanguageClient.createServerOptions(this.port, this.serverAbsolutePath),
      {
        outputChannel: this.outputChannelProvider.getMainLogChannel(),
      },
    );
  }

  getLspMode(): LspModeType {
    return 'noProject';
  }
}
