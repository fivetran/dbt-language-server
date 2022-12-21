import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { NotificationSender } from '../NotificationSender';
import { ProgressReporter } from '../ProgressReporter';
import { DbtCommand } from './commands/DbtCommand';
import { DbtCommandExecutor } from './commands/DbtCommandExecutor';
import { Dbt } from './Dbt';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';

export class DbtCli extends Dbt {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();
  pythonPathForCli?: string;

  constructor(
    private featureFinder: FeatureFinder,
    connection: _Connection,
    progressReporter: ProgressReporter,
    notificationSender: NotificationSender,
  ) {
    super(connection, progressReporter, notificationSender);
  }

  async compile(modelName?: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const parameters = ['compile'];
    if (modelName) {
      const slash = await import('slash');
      parameters.push('-m', slash.default(modelName));
    }
    const compileCliCommand = new DbtCommand(parameters, this.pythonPathForCli);
    return DbtCli.DBT_COMMAND_EXECUTOR.execute(compileCliCommand);
  }

  async prepareImplementation(dbtProfileType?: string): Promise<void> {
    this.pythonPathForCli = await this.featureFinder.findInformationForCli(dbtProfileType);

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

  createCompileJob(modelPath: string, dbtRepository: DbtRepository, allowFallback: boolean): DbtCompileJob {
    return new DbtCliCompileJob(modelPath, dbtRepository, allowFallback, this);
  }

  async compileProject(): Promise<void> {
    await this.compile();
  }

  async deps(): Promise<void> {
    const depsCommand = new DbtCommand(['deps'], this.pythonPathForCli);
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
