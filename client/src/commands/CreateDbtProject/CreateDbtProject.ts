import { exec } from 'node:child_process';
import { EOL } from 'node:os';
import { promisify, TextEncoder } from 'node:util';
import { commands, Memento, OpenDialogOptions, Uri, window, workspace } from 'vscode';
import { log } from '../../Logger';
import { PythonExtensionWrapper } from '../../python/PythonExtensionWrapper';
import { DBT_PROJECT_YML } from '../../Utils';
import { Command } from '../CommandManager';
import { DbtInitTerminal } from './DbtInitTerminal';
import path = require('node:path');

enum DbtInitState {
  Default,
  ExpectProjectName,
  ProjectAlreadyExists,
}

export class CreateDbtProject implements Command {
  readonly id = 'WizardForDbtCore(TM).createDbtProject';

  static readonly PYTHON_CODE_OLD = 'dbt.main; dbt.main.main';
  static readonly PYTHON_CODE = 'dbt.cli.main; dbt.cli.main.cli';
  static readonly INSTALLED_SUBSTRIG = 'installed:';

  static readonly TERMINAL_NAME = 'Create dbt project';
  static readonly SETTINGS_JSON_CONTENT = `{
  "files.autoSave": "afterDelay"
}
`;

  constructor(
    private extensionGlobalState: Memento,
    private pythonExtension: PythonExtensionWrapper,
  ) {}

  async execute(projectFolder?: string, skipOpen?: boolean): Promise<void> {
    const dbtInitCommandPromise = this.getDbtInitCommand();

    const projectFolderUri = projectFolder ? Uri.file(projectFolder) : await CreateDbtProject.openDialogForFolder();
    if (projectFolderUri) {
      const pty = new DbtInitTerminal(`Creating dbt project in "${projectFolderUri.fsPath}" folder.\n\rPlease answer all questions.\n\r`);
      const terminal = window.createTerminal({
        name: CreateDbtProject.TERMINAL_NAME,
        pty,
      });
      terminal.show();

      const dbtInitCommand = await dbtInitCommandPromise;
      if (!dbtInitCommand) {
        window
          .showWarningMessage('dbt not found, please choose Python that is used to run dbt.')
          .then(undefined, e => log(`Error while showing warning: ${e instanceof Error ? e.message : String(e)}`));
        await commands.executeCommand('python.setInterpreter');
        return;
      }

      log(`Running init command: ${dbtInitCommand}`);

      const initProcess = exec(dbtInitCommand, { cwd: projectFolderUri.fsPath });

      let dbtInitState = DbtInitState.Default;
      let projectName: string | undefined;
      initProcess.on('exit', async (code: number | null) => {
        if (code === 0 && dbtInitState !== DbtInitState.ProjectAlreadyExists) {
          const projectUri = projectName ? Uri.joinPath(projectFolderUri, projectName) : projectFolderUri;
          const vscodeUri = Uri.joinPath(projectUri, '.vscode');
          await workspace.fs.createDirectory(vscodeUri);
          await workspace.fs.writeFile(Uri.joinPath(vscodeUri, 'settings.json'), new TextEncoder().encode(CreateDbtProject.SETTINGS_JSON_CONTENT));
          if (!skipOpen) {
            await commands.executeCommand('vscode.openFolder', projectUri, { forceNewWindow: true });
            await this.extensionGlobalState.update(path.join(projectUri.fsPath, DBT_PROJECT_YML), true);
          }
        } else {
          pty.writeRed(`${EOL}Command failed, please try again.${EOL}`);
          dbtInitState = DbtInitState.Default;
        }
      });

      pty.onDataSubmitted((data: string) => {
        if (dbtInitState === DbtInitState.ExpectProjectName) {
          projectName = data;
          dbtInitState = DbtInitState.Default;
        }
        if (data.includes(DbtInitTerminal.CONTROL_CODES.ctrlC)) {
          initProcess.kill('SIGTERM');
        }
        initProcess.stdin?.write(`${data}${EOL}`);
      });

      initProcess.stdout?.on('data', (data: string) => {
        if (data.includes('name for your project')) {
          dbtInitState = DbtInitState.ExpectProjectName;
        } else if (data.includes('already exists here')) {
          dbtInitState = DbtInitState.ProjectAlreadyExists;
        }

        pty.write(data);
      });
    }
  }

  async getDbtInitCommand(): Promise<string | undefined> {
    const pythonInfo = await this.pythonExtension.getPythonInfo();

    const promisifiedExec = promisify(exec);
    const pythonOldCommand = `${pythonInfo.path} -c "import ${CreateDbtProject.PYTHON_CODE_OLD}(['--version'])"`;
    const pythonNewCommand = `${pythonInfo.path} -c "import ${CreateDbtProject.PYTHON_CODE}(['--version'])"`;
    const cliCommand = 'dbt --version';

    const settledResults = await Promise.allSettled([
      promisifiedExec(pythonOldCommand),
      promisifiedExec(pythonNewCommand),
      promisifiedExec(cliCommand),
    ]);
    const [pythonOldVersion, pythonNewVersion, cliVersion] = settledResults.map(v => (v.status === 'fulfilled' ? v.value : undefined));
    if (pythonNewVersion && pythonNewVersion.stdout.includes(CreateDbtProject.INSTALLED_SUBSTRIG)) {
      return `${pythonInfo.path} -c "import ${CreateDbtProject.PYTHON_CODE}(['init'])"`;
    }
    if (pythonOldVersion && pythonOldVersion.stderr.includes(CreateDbtProject.INSTALLED_SUBSTRIG)) {
      return `${pythonInfo.path} -c "import ${CreateDbtProject.PYTHON_CODE_OLD}(['init'])"`;
    }
    if (
      cliVersion &&
      (cliVersion.stderr.includes(CreateDbtProject.INSTALLED_SUBSTRIG) || cliVersion.stdout.includes(CreateDbtProject.INSTALLED_SUBSTRIG))
    ) {
      return 'dbt init';
    }
    return undefined;
  }

  static async openDialogForFolder(): Promise<Uri | undefined> {
    const options: OpenDialogOptions = {
      title: 'Choose Folder For dbt Project',
      openLabel: 'Open',
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
    };
    const result = await window.showOpenDialog(options);
    return result && result.length > 0 ? result[0] : undefined;
  }
}
