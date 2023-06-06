import { err, ok, Result } from 'neverthrow';
import { EOL } from 'node:os';
import { ProcessExecutor } from './ProcessExecutor';

export class InstallUtils {
  private static readonly PROCESS_EXECUTOR = new ProcessExecutor();

  static getFullDbtInstallationPackages(dbtVersion?: string, dbtProfileType?: string): string[] {
    const packages = [InstallUtils.withVersion('dbt-core', dbtVersion)];
    if (dbtProfileType) {
      packages.push(InstallUtils.buildAdapterPackageName(dbtProfileType));
    }
    return packages;
  }

  static async installDbt(
    python: string,
    dbtVersion?: string,
    dbtProfileType?: string,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    const packagesToInstall = InstallUtils.getFullDbtInstallationPackages(dbtVersion, dbtProfileType);
    return InstallUtils.installPythonPackages(python, packagesToInstall, false, onStdoutData, onStderrData);
  }

  static async installDbtAdapter(
    python: string,
    dbtAdapter: string,
    version?: string,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    return InstallUtils.installPythonPackages(python, [InstallUtils.withVersion(dbtAdapter, version)], false, onStdoutData, onStderrData);
  }

  static async installPythonPackages(
    python: string,
    packages: string[],
    upgrade: boolean,
    onStdoutData?: (data: string) => void,
    onStderrData?: (data: string) => void,
  ): Promise<Result<string, string>> {
    const installCommand = `${python} -m pip install ${upgrade ? '--upgrade' : ''} ${packages.join(' ')}`;
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

  private static buildAdapterPackageName(dbtProfileType: string): string {
    return `dbt-${dbtProfileType}`;
  }

  private static withVersion(packageName: string, version: string | undefined): string {
    return version ? `${packageName}==${version}` : packageName;
  }
}
