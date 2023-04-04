import { OutputChannel, window } from 'vscode';

export class OutputChannelProvider {
  private mainLogChannel = window.createOutputChannel('Wizard for dbt Core (TM)');
  private traceChannel = window.createOutputChannel('Wizard for dbt Core (TM) Trace');
  private installDbtCoreChannel?: OutputChannel;
  private installDbtAdaptersChannel?: OutputChannel;

  getMainLogChannel(): OutputChannel {
    return this.mainLogChannel;
  }

  getTraceChannel(): OutputChannel {
    return this.traceChannel;
  }

  getInstallDbtCoreChannel(): OutputChannel {
    if (!this.installDbtCoreChannel) {
      this.installDbtCoreChannel = window.createOutputChannel('Install dbt Core');
    }
    return this.installDbtCoreChannel;
  }

  getInstallDbtAdaptersChannel(): OutputChannel {
    if (!this.installDbtAdaptersChannel) {
      this.installDbtAdaptersChannel = window.createOutputChannel('Install dbt Adapters');
    }
    return this.installDbtAdaptersChannel;
  }
}
