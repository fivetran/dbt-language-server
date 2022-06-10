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

  static getFullDbtInstallationPackagesLegacy(): string[] {
    /** From dbt console error:
     * For the previous behavior of `pip install dbt`:
     * pip install dbt-core dbt-postgres dbt-redshift dbt-snowflake dbt-bigquery
     */
    return ['dbt-core', 'dbt-postgres', 'dbt-redshift', 'dbt-snowflake', 'dbt-bigquery'];
  }

  static async installDbtPackages(python: string, packages: string[], upgrade = false): Promise<Result<void, string>> {
    const installDbtCommand = `${python} -m pip install ${upgrade ? DbtHelper.UPGRADE_PARAM : ''} ${packages.join(' ')}`;
    return DbtHelper.PROCESS_EXECUTOR.execProcess(installDbtCommand.toString())
      .then(() => {
        console.log(`dbt packages successfully installed ('${installDbtCommand.toString()}')`);
        return ok(undefined);
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
