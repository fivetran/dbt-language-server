import { CompletionItem } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { JinjaPartType } from '../JinjaParser';
import { MacroCompletionProvider } from './MacroCompletionProvider';
import { ModelCompletionProvider } from './ModelCompletionProvider';
import { SourceCompletionProvider } from './SourceCompletionProvider';

export interface DbtNodeCompletionProvider {
  provideCompletions(jinjaPartType: JinjaPartType, jinjaBeforePositionText: string): CompletionItem[] | undefined;
}

export class DbtCompletionProvider {
  macroCompletionProvider: MacroCompletionProvider;
  modelCompletionProvider: ModelCompletionProvider;
  sourceCompletionProvider: SourceCompletionProvider;

  constructor(private dbtRepository: DbtRepository) {
    this.macroCompletionProvider = new MacroCompletionProvider(this.dbtRepository);
    this.modelCompletionProvider = new ModelCompletionProvider(this.dbtRepository);
    this.sourceCompletionProvider = new SourceCompletionProvider(this.dbtRepository);
  }

  provideCompletions(jinjaPartType: JinjaPartType, jinjaBeforePositionText: string): CompletionItem[] | undefined {
    return (
      this.modelCompletionProvider.provideCompletions(jinjaPartType, jinjaBeforePositionText) ??
      this.sourceCompletionProvider.provideCompletions(jinjaPartType, jinjaBeforePositionText) ??
      this.macroCompletionProvider.provideCompletions(jinjaPartType, jinjaBeforePositionText)
    );
  }
}
