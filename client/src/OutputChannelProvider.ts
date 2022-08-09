import { OutputChannel, window } from 'vscode';

export class OutputChannelProvider {
  private mainLogChannel = window.createOutputChannel('dbt Wizard');
  private installLatestDbtChannel?: OutputChannel;
  private installDbtAdaptersChannel?: OutputChannel;

  getMainLogChannel(): OutputChannel {
    return this.mainLogChannel;
  }

  getInstallLatestDbtChannel(): OutputChannel {
    if (!this.installLatestDbtChannel) {
      this.installLatestDbtChannel = window.createOutputChannel('Install Latest dbt');
    }
    return this.installLatestDbtChannel;
  }

  getInstallDbtAdaptersChannel(): OutputChannel {
    if (!this.installDbtAdaptersChannel) {
      this.installDbtAdaptersChannel = window.createOutputChannel('Install dbt Adapters');
    }
    return this.installDbtAdaptersChannel;
  }
}
