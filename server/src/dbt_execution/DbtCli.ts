import { Result, err, ok } from 'neverthrow';
import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { MacroCompilationServer } from '../MacroCompilationServer';
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
    private macroCompilationServer: MacroCompilationServer,
  ) {
    super(connection, modelProgressReporter, notificationSender);
    this.macroCompilationServer
      .start()
      .catch(e => console.log(`Failed to start macroCompilationServer: ${e instanceof Error ? e.message : String(e)}`));
  }

  async compile(modelName?: string): Promise<{
    stdout: string;
    stderr: string;
  }> {
    const params = ['compile'];
    if (modelName) {
      params.push('-m', `+${slash(modelName)}`);
    }
    const log = (data: string): void => console.log(data);
    return this.executeCommand(params, log, log);
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
    await this.executeCommand(['deps'], onStdoutData, onStderrData);
  }

  getError(): string {
    return this.getInstallError('dbt', 'python3 -m pip install dbt-bigquery');
  }

  private executeCommand(
    params: string[],
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<{
    stdout: string;
    stderr: string;
  }> {
    if (!this.pythonPathForCli || !this.macroCompilationServer.port) {
      throw new Error('Incorrect state');
    }
    return DbtCli.PROCESS_EXECUTOR.execProcess(
      `${this.pythonPathForCli} ${this.dbtCoreScriptPath} ${this.macroCompilationServer.port} ${params.join(' ')}`,
      onStdoutData,
      onStderrData,
    );
  }
}
