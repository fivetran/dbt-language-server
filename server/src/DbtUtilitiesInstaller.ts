import { err, ok, Result } from 'neverthrow';
import { EOL } from 'os';
import { ProcessExecutor } from './ProcessExecutor';

export class DbtUtilitiesInstaller {
  static readonly DBT_CORE = 'dbt-core';
  static readonly DBT_RPC = 'dbt-rpc';
  static readonly DBT_PREFIX = 'dbt';

  static readonly UPGRADE_PARAM = '--upgrade';

  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  static getFullDbtInstallationPackages(dbtProfileType: string): string[] {
    return [DbtUtilitiesInstaller.DBT_CORE, DbtUtilitiesInstaller.DBT_RPC, DbtUtilitiesInstaller.buildAdapterPackageName(dbtProfileType)];
  }

  static async installDbt(
    python: string,
    dbtProfileType: string,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    const packagesToInstall = DbtUtilitiesInstaller.getFullDbtInstallationPackages(dbtProfileType);
    return DbtUtilitiesInstaller.installPythonPackages(python, packagesToInstall, true, onStdoutData, onStderrData);
  }

  static async installLatestDbtRpc(python: string, dbtProfileType?: string): Promise<Result<string, string>> {
    const packages = [DbtUtilitiesInstaller.DBT_RPC];
    if (dbtProfileType) {
      packages.push(DbtUtilitiesInstaller.buildAdapterPackageName(dbtProfileType));
    }
    return DbtUtilitiesInstaller.installPythonPackages(python, packages);
  }

  static async installPythonPackages(
    python: string,
    packages: string[],
    upgrade = false,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    const installCommand = `${python} -m pip install ${upgrade ? DbtUtilitiesInstaller.UPGRADE_PARAM : ''} ${packages.join(' ')}`;
    if (onStdoutData) {
      onStdoutData(`${EOL}${EOL}${installCommand}${EOL}`);
    }
    try {
      await DbtUtilitiesInstaller.PROCESS_EXECUTOR.execProcess(installCommand, onStdoutData, onStderrData);
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
