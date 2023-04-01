import { err, ok, Result } from 'neverthrow';
import { EOL } from 'node:os';
import { ProcessExecutor } from './ProcessExecutor';

export class InstallUtils {
  static readonly DBT_CORE = 'dbt-core';
  static readonly DBT_PREFIX = 'dbt';

  static readonly UPGRADE_PARAM = '--upgrade';

  static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  static getFullDbtInstallationPackages(dbtProfileType?: string): string[] {
    const packages = [InstallUtils.DBT_CORE];
    if (dbtProfileType) {
      packages.push(InstallUtils.buildAdapterPackageName(dbtProfileType));
    }
    return packages;
  }

  static async installDbt(
    python: string,
    dbtProfileType?: string,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    const packagesToInstall = InstallUtils.getFullDbtInstallationPackages(dbtProfileType);
    return InstallUtils.installPythonPackages(python, packagesToInstall, true, onStdoutData, onStderrData);
  }

  static async installDbtAdapter(
    python: string,
    dbtAdapter: string,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    return InstallUtils.installPythonPackages(python, [dbtAdapter], true, onStdoutData, onStderrData);
  }

  static async installPythonPackages(
    python: string,
    packages: string[],
    upgrade = false,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    const installCommand = `${python} -m pip install ${upgrade ? InstallUtils.UPGRADE_PARAM : ''} ${packages.join(' ')}`;
    if (onStdoutData) {
      onStdoutData(`${EOL}${EOL}${installCommand}${EOL}`);
    }
    try {
      await InstallUtils.PROCESS_EXECUTOR.execProcess(installCommand, onStdoutData, onStderrData);
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
    return `${InstallUtils.DBT_PREFIX}-${dbtProfileType}`;
  }
}
