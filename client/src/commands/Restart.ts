import { DbtLanguageClientManager } from '../DbtLanguageClientManager';
import { Command } from './CommandManager';

export class Restart implements Command {
  readonly id = 'WizardForDbtCore(TM).restart';

  constructor(private dbtLanguageClientManager: DbtLanguageClientManager) {}

  async execute(): Promise<void> {
    const client = await this.dbtLanguageClientManager.getClientForActiveDocument();
    await client?.restart();
  }
}
