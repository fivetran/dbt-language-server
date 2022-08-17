import { commands } from 'vscode';
import { Command } from './CommandManager';

export class AfterFunctionCompletion implements Command {
  readonly id = 'dbtWizard.afterFunctionCompletion';

  async execute(): Promise<void> {
    await commands.executeCommand('cursorMove', {
      to: 'left',
      by: 'wrappedLine',
      select: false,
      value: 1,
    });
    await commands.executeCommand('editor.action.triggerParameterHints');
  }
}
