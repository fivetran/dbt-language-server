import { CompletionItem, CompletionParams } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { JinjaType } from '../JinjaParser';
import { MacroCompletionProvider } from './MacroCompletionProvider';
import { ModelCompletionProvider } from './ModelCompletionProvider';
import { SourceCompletionProvider } from './SourceCompletionProvider';

export interface DbtNodeCompletionProvider {
  provideCompletions(completionParams: CompletionParams, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined>;
}

export class DbtCompletionProvider {
  macroCompletionProvider: MacroCompletionProvider;
  modelCompletionProvider: ModelCompletionProvider;
  sourceCompletionProvider: SourceCompletionProvider;

  constructor(private dbtRepository: DbtRepository) {
    this.macroCompletionProvider = new MacroCompletionProvider();
    this.modelCompletionProvider = new ModelCompletionProvider(this.dbtRepository);
    this.sourceCompletionProvider = new SourceCompletionProvider();
  }

  async provideCompletions(
    completionParams: CompletionParams,
    jinjaBeforePositionText: string,
    jinjaType: JinjaType | undefined,
  ): Promise<CompletionItem[] | undefined> {
    const modelCompletions =
      jinjaType === JinjaType.EXPRESSION
        ? await this.modelCompletionProvider.provideCompletions(completionParams, jinjaBeforePositionText)
        : undefined;
    if (modelCompletions) {
      return modelCompletions;
    }

    const sourceCompletions =
      jinjaType === JinjaType.EXPRESSION
        ? await this.sourceCompletionProvider.provideCompletions(completionParams, jinjaBeforePositionText)
        : undefined;
    if (sourceCompletions) {
      return sourceCompletions;
    }

    const macroCompletions =
      jinjaType === JinjaType.EXPRESSION || jinjaType === JinjaType.BLOCK
        ? await this.macroCompletionProvider.provideCompletions(completionParams, jinjaBeforePositionText)
        : undefined;
    if (macroCompletions) {
      return macroCompletions;
    }

    return Promise.resolve(undefined);
  }
}
