import { exec } from 'node:child_process';
import { EOL } from 'node:os';
import { promisify, TextEncoder } from 'node:util';
import { commands, OpenDialogOptions, Uri, window, workspace } from 'vscode';
import { log } from '../../Logger';
import { PythonExtension } from '../../python/PythonExtension';
import { Command } from '../CommandManager';
import { DbtInitTerminal } from './DbtInitTerminal';

enum DbtInitState {
  Default,
  ExpectProjectName,
  ProjectAlreadyExists,
}

export class CreateDbtProject implements Command {
  readonly id = 'WizardForDbtCore(TM).createDbtProject';

  static readonly TERMINAL_NAME = 'Create dbt project';
  static readonly SETTINGS_JSON_CONTENT = `{
  "files.autoSave": "afterDelay"
}
`;

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
    const pythonInfo = await new PythonExtension().getPythonInfo();
    if (!pythonInfo) {
      return undefined;
    }

    const promisifiedExec = promisify(exec);
    const pythonCommand = `${pythonInfo.path} -c "import dbt.main; dbt.main.main(['--version'])"`;
    const cliCommand = 'dbt --version';

    const settledResults = await Promise.allSettled([promisifiedExec(pythonCommand), promisifiedExec(cliCommand)]);
    const [pythonVersion, cliVersion] = settledResults.map(v => (v.status === 'fulfilled' ? v.value : undefined));
    if (pythonVersion && pythonVersion.stderr.length > 0) {
      return `${pythonInfo.path} -c "import dbt.main; dbt.main.main(['init'])"`;
    }
    if (cliVersion && cliVersion.stderr.length > 0) {
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
