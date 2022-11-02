import { DbtCompletionProvider } from './completion/DbtCompletionProvider';
import { DbtRepository } from './DbtRepository';
import { SnippetsCompletionProvider } from './SnippetsCompletionProvider';
import { SqlCompletionProvider } from './SqlCompletionProvider';

export class CompletionProvider {
  sqlCompletionProvider = new SqlCompletionProvider();
  snippetsCompletionProvider = new SnippetsCompletionProvider();
  dbtCompletionProvider: DbtCompletionProvider;

  constructor(dbtRepository: DbtRepository) {
    this.dbtCompletionProvider = new DbtCompletionProvider(dbtRepository);
  }
}
