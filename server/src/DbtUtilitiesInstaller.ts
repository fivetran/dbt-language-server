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
    const installCommand = `${python} -m pip install ${upgrade ? DbtUtilitiesInstaller.UPGRADE_PARAM : ''} ${packages.join(' ')}`;
    try {
      await DbtUtilitiesInstaller.PROCESS_EXECUTOR.execProcess(installCommand);
      const successMessage = `Packages successfully installed ('${installCommand}')`;
      console.log(successMessage);
      return ok(successMessage);
    } catch (e) {
      const errorMessage = `Packages installation failed ('${installCommand}'). Reason: ${e instanceof Error ? e.message : String(e)}`;
      console.log(errorMessage);
      return err(errorMessage);
    }
  }

  static buildAdapterPackageName(dbtProfileType: string): string {
    return `${DbtUtilitiesInstaller.DBT_PREFIX}-${dbtProfileType}`;
  }
}
