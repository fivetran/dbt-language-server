import { Result, err, ok } from 'neverthrow';
import { dirname } from 'node:path';
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
import path = require('node:path');

export class DbtCli extends Dbt {
  static readonly DBT_COMMAND_EXECUTOR = new DbtCommandExecutor();
  static readonly DBT_CORE_SCRIPT = path.resolve(dirname(require.main?.filename ?? __dirname), '..', 'dbt_core.py');

  pythonPathForCli?: string; // TODO: make it required
  dbtLess1point5 = false;

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
      parameters.push('-m', `+${slash(modelName)}`);
    }
    const log = (data: string): void => console.log(data);
    return DbtCommandExecutor.PROCESS_EXECUTOR.execProcess(`${this.pythonPathForCli!} ${DbtCli.DBT_CORE_SCRIPT} ${parameters.join(' ')}`, log, log);
  }

  async prepareImplementation(dbtProfileType?: string): Promise<void> {
    const cliInfo = await this.featureFinder.findInformationForCli();
    this.pythonPathForCli = cliInfo.pythonPath;
    this.dbtLess1point5 = cliInfo.dbtLess1point5;

    if (!this.featureFinder.versionInfo?.installedVersion || !this.featureFinder.versionInfo.installedAdapters.some(a => a.name === dbtProfileType)) {
      try {
        if (dbtProfileType && this.featureFinder.pythonInfo) {
          await this.suggestToInstallDbt(this.featureFinder.pythonInfo.path, dbtProfileType);
        } else {
          this.onDbtFindFailed();
        }
      } catch {
        this.onDbtFindFailed();
      }
    }
  }

  createCompileJob(modelPath: string | undefined, dbtRepository: DbtRepository, allowFallback: boolean): DbtCompileJob {
    return new DbtCliCompileJob(modelPath, dbtRepository, allowFallback, this);
  }

  async compileProject(dbtRepository: DbtRepository): Promise<Result<void, string>> {
    const job = this.createCompileJob(undefined, dbtRepository, true);
    console.log('Starting project compilation');
    const result = await job.start();

    if (result.isOk()) {
      console.log('Project compiled successfully');
      return ok(undefined);
    }

    console.log(`There was an error while project compilation ${result.error}`);
    return err(result.error);
  }

  async deps(onStdoutData: (data: string) => void, onStderrData: (data: string) => void): Promise<void> {
    const depsCommand = new DbtCommand(
      this.featureFinder.profilesYmlDir,
      ['--no-anonymous-usage-stats', '--no-use-colors', 'deps'],
      this.dbtLess1point5,
      this.pythonPathForCli,
    );
    await DbtCli.DBT_COMMAND_EXECUTOR.execute(depsCommand, onStdoutData, onStderrData);
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
