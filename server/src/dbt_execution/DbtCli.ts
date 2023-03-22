import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { ModelProgressReporter } from '../ModelProgressReporter';
import { NotificationSender } from '../NotificationSender';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { Dbt } from './Dbt';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';
import { DbtCommand } from './commands/DbtCommand';
import { DbtCommandExecutor } from './commands/DbtCommandExecutor';
import slash = require('slash');

export class DbtCli extends Dbt {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();
  pythonPathForCli?: string;

  constructor(
    private featureFinder: FeatureFinder,
    connection: _Connection,
    modelProgressReporter: ModelProgressReporter,
    notificationSender: NotificationSender,
  ) {
    super(connection, modelProgressReporter, notificationSender);
  }

  async compile(modelName?: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const parameters = ['compile'];
    if (modelName) {
      parameters.push('-m', slash(modelName));
    }
    const compileCliCommand = new DbtCommand(this.featureFinder.profilesYmlDir, parameters, this.pythonPathForCli);
    return DbtCli.DBT_COMMAND_EXECUTOR.execute(compileCliCommand);
  }

  async prepareImplementation(dbtProfileType?: string): Promise<void> {
    this.pythonPathForCli = await this.featureFinder.findInformationForCli();

    if (!this.featureFinder.versionInfo?.installedVersion || this.featureFinder.versionInfo.installedAdapters.length === 0) {
      try {
        if (dbtProfileType && this.featureFinder.pythonInfo) {
          await this.suggestToInstallDbt(this.featureFinder.pythonInfo.path, dbtProfileType);
        } else {
          this.onRpcServerFindFailed();
        }
      } catch {
        this.onRpcServerFindFailed();
      }
    }
  }

  createCompileJob(modelPath: string | undefined, dbtRepository: DbtRepository, allowFallback: boolean): DbtCompileJob {
    return new DbtCliCompileJob(modelPath, dbtRepository, allowFallback, this);
  }

  async compileProject(dbtRepository: DbtRepository): Promise<void> {
    const job = this.createCompileJob(undefined, dbtRepository, true);
    console.log('Starting project compilation');
    const result = await job.start();

    if (result.isOk()) {
      console.log('Project compiled successfully');
    } else {
      console.log(`There was an error while project compilation ${result.error}`);
    }
  }

  async deps(): Promise<void> {
    const depsCommand = new DbtCommand(this.featureFinder.profilesYmlDir, ['deps'], this.pythonPathForCli);
    await DbtCli.DBT_COMMAND_EXECUTOR.execute(depsCommand);
  }

  refresh(): void {
    // Nothing to refresh
  }

  getError(): string {
    return this.getInstallError('dbt', 'python3 -m pip install dbt-bigquery');
  }

  dispose(): void {
    // Nothing to dispose
  }
}
