import { err, ok, Result } from 'neverthrow';
import { ProcessExecutor } from './ProcessExecutor';

export class DbtHelper {
  private static readonly DBT_CORE = 'dbt-core';
  private static readonly DBT_RPC = 'dbt-rpc';
  private static readonly DBT_ADAPTER_PREFIX = 'dbt-';

  private static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  static async installDbtPackages(python: string, dbtProfileType: string): Promise<Result<void, string>> {
    const profileAdapter = `${DbtHelper.DBT_ADAPTER_PREFIX}${dbtProfileType}`;
    const installDbtCommand = `${python} -m pip install ${DbtHelper.DBT_CORE} ${DbtHelper.DBT_RPC} ${profileAdapter}`;

    return DbtHelper.PROCESS_EXECUTOR.execProcess(installDbtCommand.toString())
      .then(() => {
        console.log(`dbt successfully installed ('${installDbtCommand.toString()}')`);
        return ok(undefined);
      })
      .catch((error: string) => {
        const errorMessage = `dbt installation failed ('${installDbtCommand.toString()}'). Reason: ${error}`;
        console.log(errorMessage);
        return err(errorMessage);
      });
  }
}
