import { DbtVersionInfo, PythonInfo } from 'dbt-language-server-common';
import { DbtCommandExecutor } from '../dbt_execution/commands/DbtCommandExecutor';
import { FeatureFinderBase } from './FeatureFinderBase';

export class NoProjectFeatureFinder extends FeatureFinderBase {
  private availableCommandsPromise: Promise<[DbtVersionInfo | undefined, DbtVersionInfo | undefined]>;

  constructor(pythonInfo: PythonInfo | undefined, dbtCommandExecutor: DbtCommandExecutor) {
    super(pythonInfo, dbtCommandExecutor, undefined);
    this.availableCommandsPromise = this.getAvailableDbt();
  }

  async getAvailableDbt(): Promise<[DbtVersionInfo | undefined, DbtVersionInfo | undefined]> {
    const settledResults = await Promise.allSettled([this.findDbtPythonInfoOld(), this.findDbtPythonInfo()]);
    const [dbtPythonVersionOld, dbtPythonVersion] = settledResults.map(v => (v.status === 'fulfilled' ? v.value : undefined));

    console.log(this.getLogString('dbtPythonVersionOld', dbtPythonVersionOld) + this.getLogString('dbtPythonVersion', dbtPythonVersion));

    return [dbtPythonVersionOld, dbtPythonVersion];
  }

  async findDbtForNoProjectStatus(): Promise<void> {
    const [dbtPythonVersionOld, dbtPythonVersion] = await this.availableCommandsPromise;
    this.versionInfo = dbtPythonVersion?.installedVersion ? dbtPythonVersion : dbtPythonVersionOld;
  }
}
