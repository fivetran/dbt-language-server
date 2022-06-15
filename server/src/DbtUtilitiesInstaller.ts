import { err, ok, Result } from 'neverthrow';
import { ProcessExecutor } from './ProcessExecutor';

export class DbtUtilitiesInstaller {
  private static readonly DBT_CORE = 'dbt-core';
  private static readonly DBT_RPC = 'dbt-rpc';
  private static readonly DBT_PREFIX = 'dbt';

  private static readonly UPGRADE_PARAM = '--upgrade';

  private static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  static getFullDbtInstallationPackages(dbtProfileType: string): string[] {
    return [DbtUtilitiesInstaller.DBT_CORE, DbtUtilitiesInstaller.DBT_RPC, DbtUtilitiesInstaller.buildAdapterPackageName(dbtProfileType)];
  }

  static async installPackages(python: string, packages: string[], upgrade = false): Promise<Result<string, string>> {
    const installDbtCommand = `${python} -m pip install ${upgrade ? DbtUtilitiesInstaller.UPGRADE_PARAM : ''} ${packages.join(' ')}`;
    return DbtUtilitiesInstaller.PROCESS_EXECUTOR.execProcess(installDbtCommand)
      .then(() => {
        const successMessage = `dbt packages successfully installed ('${installDbtCommand}')`;
        console.log(successMessage);
        return ok(successMessage);
      })
      .catch((error: string) => {
        const errorMessage = `dbt packages installation failed ('${installDbtCommand}'). Reason: ${error}`;
        console.log(errorMessage);
        return err(errorMessage);
      });
  }

  static buildAdapterPackageName(dbtProfileType: string): string {
    return `${DbtUtilitiesInstaller.DBT_PREFIX}-${dbtProfileType}`;
  }
}
