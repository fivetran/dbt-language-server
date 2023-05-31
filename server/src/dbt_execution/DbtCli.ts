import { Result, err, ok } from 'neverthrow';
import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { ModelProgressReporter } from '../ModelProgressReporter';
import { NotificationSender } from '../NotificationSender';
import { ProcessExecutor } from '../ProcessExecutor';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { MAIN_FILE_PATH } from '../server';
import { Dbt } from './Dbt';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCompileJob } from './DbtCompileJob';
import slash = require('slash');
import path = require('node:path');

export class DbtCli extends Dbt {
  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  pythonPathForCli?: string; // TODO: make it required
  dbtCoreScriptPath = path.resolve(MAIN_FILE_PATH, '..', 'dbt_core.py');

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
    if (!this.pythonPathForCli) {
      throw new Error('pythonPathForCli is not defined');
    }
    return DbtCli.PROCESS_EXECUTOR.execProcess(`${this.pythonPathForCli} ${this.dbtCoreScriptPath} ${parameters.join(' ')}`, log, log);
  }

  async prepareImplementation(dbtProfileType?: string): Promise<void> {
    const cliInfo = await this.featureFinder.findInformationForCli();
    this.pythonPathForCli = cliInfo.pythonPath;

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
    if (!this.pythonPathForCli) {
      throw new Error('pythonPathForCli is not defined');
    }
    await DbtCli.PROCESS_EXECUTOR.execProcess(`${this.pythonPathForCli} ${this.dbtCoreScriptPath} deps`, onStdoutData, onStderrData);
  }

  getError(): string {
    return this.getInstallError('dbt', 'python3 -m pip install dbt-bigquery');
  }
}
