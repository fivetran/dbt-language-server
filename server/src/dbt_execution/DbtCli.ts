import { Result, err, ok } from 'neverthrow';
import { PromiseWithChild } from 'node:child_process';
import { _Connection } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { MacroCompilationServer } from '../MacroCompilationServer';
import { ModelProgressReporter } from '../ModelProgressReporter';
import { NotificationSender } from '../NotificationSender';
import { ProcessExecutor } from '../ProcessExecutor';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import { Dbt } from './Dbt';
import { DbtCliCompileJob } from './DbtCliCompileJob';
import { DbtCommandExecutor } from './DbtCommandExecutor';
import { DbtCompileJob } from './DbtCompileJob';
import slash = require('slash');

export class DbtCli extends Dbt {
  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  constructor(
    private featureFinder: FeatureFinder,
    connection: _Connection,
    modelProgressReporter: ModelProgressReporter,
    notificationSender: NotificationSender,
    private macroCompilationServer: MacroCompilationServer,
    private dbtCommandExecutor: DbtCommandExecutor,
  ) {
    super(connection, modelProgressReporter, notificationSender);
    this.macroCompilationServer
      .start()
      .catch(e => console.log(`Failed to start macroCompilationServer: ${e instanceof Error ? e.message : String(e)}`));
  }

  compile(modelName?: string): PromiseWithChild<{
    stdout: string;
    stderr: string;
  }> {
    const params = [];
    if (modelName) {
      params.push('-m', `+${slash(modelName)}`);
    }
    const log = (data: string): void => console.log(data);

    if (!this.macroCompilationServer.port) {
      throw new Error('Incorrect state: macroCompilationServer port is required');
    }
    return this.dbtCommandExecutor.compile(this.macroCompilationServer.port, this.featureFinder.profilesYmlDir, log, log, params);
  }

  async prepareImplementation(dbtProfileType?: string): Promise<void> {
    await this.featureFinder.availableDbtPromise;
    if (!this.featureFinder.versionInfo?.installedVersion || !this.featureFinder.versionInfo.installedAdapters.some(a => a.name === dbtProfileType)) {
      try {
        if (dbtProfileType) {
          await this.suggestToInstallDbt(this.featureFinder.getPythonPath(), dbtProfileType);
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
    if (!this.macroCompilationServer.port) {
      throw new Error('Incorrect state: macroCompilationServer port is required');
    }
    await this.dbtCommandExecutor.deps(this.macroCompilationServer.port, this.featureFinder.profilesYmlDir, onStdoutData, onStderrData);
  }

  getError(): string {
    return this.getInstallError('dbt', 'python3 -m pip install dbt-bigquery');
  }
}
