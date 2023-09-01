import SqlPreviewContentProvider from '../SqlPreviewContentProvider';
import { Command } from './CommandManager';

export class UseConfigForRefsPreview implements Command {
  readonly id = 'WizardForDbtCore(TM).useConfigForRefsPreview';

  constructor(private sqlPreviewContentProvider: SqlPreviewContentProvider) {}

  execute(): void {
    this.sqlPreviewContentProvider.changeMode(true);
  }
}
