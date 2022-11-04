import { LspModeType } from 'dbt-language-server-common';
import { Uri } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { DbtLanguageClient } from './DbtLanguageClient';
import { DbtWizardLanguageClient } from './DbtWizardLanguageClient';
import { StatusHandler } from './status/StatusHandler';

export class NoProjectLanguageClient extends DbtWizardLanguageClient {
  constructor(private port: number, statusHandler: StatusHandler, private serverAbsolutePath: string) {
    super(statusHandler, Uri.file('/')); // TODO
  }

  initializeClient(): LanguageClient {
    return new LanguageClient('dbtWizard', 'Wizard for dbt Core (TM)', DbtLanguageClient.createServerOptions(this.port, this.serverAbsolutePath), {});
  }

  getLspMode(): LspModeType {
    return 'noProject';
  }
}
