import SqlPreviewContentProvider from '../SqlPreviewContentProvider';
import { Command } from './CommandManager';

export class NotUseConfigForRefsPreview implements Command {
  readonly id = 'WizardForDbtCore(TM).notUseConfigForRefsPreview';

  constructor(private sqlPreviewContentProvider: SqlPreviewContentProvider) {}

  execute(): void {
    this.sqlPreviewContentProvider.changeMode(false);
  }
}
