import { OutputChannel, window } from 'vscode';

export class OutputChannelProvider {
  private mainLogChannel = window.createOutputChannel('Wizard for dbt Core (TM)');
  private traceChannel = window.createOutputChannel('Wizard for dbt Core (TM) Trace');
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
