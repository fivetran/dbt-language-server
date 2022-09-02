import { OutputChannel, window } from 'vscode';

export class OutputChannelProvider {
  private mainLogChannel = window.createOutputChannel('dbt Wizard');
  private traceChannel = window.createOutputChannel('dbt Wizard Trace');
  private installLatestDbtChannel?: OutputChannel;
  private installDbtAdaptersChannel?: OutputChannel;

  getMainLogChannel(): OutputChannel {
    return this.mainLogChannel;
  }

  getTraceChannel(): OutputChannel {
    return this.traceChannel;
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
