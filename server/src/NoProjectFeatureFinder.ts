import { DbtVersionInfo, PythonInfo } from 'dbt-language-server-common';
import { DbtCommandExecutor } from './dbt_execution/commands/DbtCommandExecutor';
import { FeatureFinderBase } from './FeatureFinderBase';

export class NoProjectFeatureFinder extends FeatureFinderBase {
  availableCommandsPromise: Promise<[DbtVersionInfo?, DbtVersionInfo?]>;

  constructor(pythonInfo: PythonInfo | undefined, dbtCommandExecutor: DbtCommandExecutor) {
    super(pythonInfo, dbtCommandExecutor);
    this.availableCommandsPromise = this.getAvailableDbt();
  }

  async getAvailableDbt(): Promise<[DbtVersionInfo?, DbtVersionInfo?]> {
    const settledResults = await Promise.allSettled([this.findDbtRpcPythonInfo(), this.findDbtPythonInfo()]);
    const [dbtRpcPythonVersion, dbtPythonVersion] = settledResults.map(v => (v.status === 'fulfilled' ? v.value : undefined));

    console.log(this.getLogString('dbtRpcPythonVersion', dbtRpcPythonVersion) + this.getLogString('dbtPythonVersion', dbtPythonVersion));

    return [dbtRpcPythonVersion, dbtPythonVersion];
  }

  async findDbtForNoProjectStatus(): Promise<void> {
    const [dbtRpcPythonVersion, dbtPythonVersion] = await this.availableCommandsPromise;
    if (dbtRpcPythonVersion) {
      this.versionInfo = dbtRpcPythonVersion;
    } else if (dbtPythonVersion) {
      this.versionInfo = dbtPythonVersion;
    }
  }
}
