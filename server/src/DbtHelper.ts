import { err, ok, Result } from 'neverthrow';
import { ProcessExecutor } from './ProcessExecutor';

export class DbtHelper {
  private static readonly DBT_CORE = 'dbt-core';
  private static readonly DBT_RPC = 'dbt-rpc';
  private static readonly DBT_PREFIX = 'dbt';

  private static readonly UPGRADE_PARAM = '--upgrade';

  private static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  static getFullDbtInstallationPackages(dbtProfileType: string): string[] {
    return [DbtHelper.DBT_CORE, DbtHelper.DBT_RPC, DbtHelper.buildAdapterPackageName(dbtProfileType)];
  }

  static async installDbtPackages(python: string, packages: string[], upgrade = false): Promise<Result<string, string>> {
    const installDbtCommand = `${python} -m pip install ${upgrade ? DbtHelper.UPGRADE_PARAM : ''} ${packages.join(' ')}`;
    return DbtHelper.PROCESS_EXECUTOR.execProcess(installDbtCommand.toString())
      .then(() => {
        const successMessage = `dbt packages successfully installed ('${installDbtCommand.toString()}')`;
        console.log(successMessage);
        return ok(successMessage);
      })
      .catch((error: string) => {
        const errorMessage = `dbt packages installation failed ('${installDbtCommand.toString()}'). Reason: ${error}`;
        console.log(errorMessage);
        return err(errorMessage);
      });
  }

  static buildAdapterPackageName(dbtProfileType: string): string {
    return `${DbtHelper.DBT_PREFIX}-${dbtProfileType}`;
  }
}
