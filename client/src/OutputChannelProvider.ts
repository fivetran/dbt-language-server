import { OutputChannel, window } from 'vscode';

export class OutputChannelProvider {
  private mainLogChannel = window.createOutputChannel('dbt Wizard');
  private installLatestDbtChannel?: OutputChannel;

  getMainLogChannel(): OutputChannel {
    return this.mainLogChannel;
  }

  getInstallLatestDbtChannel(): OutputChannel {
    if (!this.installLatestDbtChannel) {
      this.installLatestDbtChannel = window.createOutputChannel('Install Latest dbt', 'shellscript');
    }
    return this.installLatestDbtChannel;
  }
}
