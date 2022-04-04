import { CompletionItem } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { JinjaType } from '../JinjaParser';
import { MacroCompletionProvider } from './MacroCompletionProvider';
import { ModelCompletionProvider } from './ModelCompletionProvider';
import { SourceCompletionProvider } from './SourceCompletionProvider';

export interface DbtNodeCompletionProvider {
  provideCompletions(jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined>;
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

  async provideCompletions(jinjaType: JinjaType | undefined, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    const modelCompletions =
      jinjaType === JinjaType.EXPRESSION ? await this.modelCompletionProvider.provideCompletions(jinjaBeforePositionText) : undefined;
    if (modelCompletions) {
      return modelCompletions;
    }

    const sourceCompletions =
      jinjaType === JinjaType.EXPRESSION ? await this.sourceCompletionProvider.provideCompletions(jinjaBeforePositionText) : undefined;
    if (sourceCompletions) {
      return sourceCompletions;
    }

    const macroCompletions =
      jinjaType === JinjaType.EXPRESSION || jinjaType === JinjaType.BLOCK
        ? await this.macroCompletionProvider.provideCompletions(jinjaBeforePositionText)
        : undefined;
    if (macroCompletions) {
      return macroCompletions;
    }

    return Promise.resolve(undefined);
  }
}
