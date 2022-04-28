import { CompletionItem } from 'vscode-languageserver';
import { DbtRepository } from '../DbtRepository';
import { JinjaPartType } from '../JinjaParser';
import { MacroCompletionProvider } from './MacroCompletionProvider';
import { ModelCompletionProvider } from './ModelCompletionProvider';
import { SourceCompletionProvider } from './SourceCompletionProvider';

export interface DbtNodeCompletionProvider {
  provideCompletions(jinjaPartType: JinjaPartType, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined>;
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

  async provideCompletions(jinjaPartType: JinjaPartType, jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    console.log('--- provideCompletions start ---');
    console.log(`jinjaPartType: ${JinjaPartType[jinjaPartType]}`);
    console.log(`jinjaBeforePositionText: ${jinjaBeforePositionText}`);
    console.log('--- provideCompletions end ---');

    const modelCompletions = await this.modelCompletionProvider.provideCompletions(jinjaPartType, jinjaBeforePositionText);
    if (modelCompletions) {
      console.log(`modelCompletions: ${modelCompletions}`);
      return modelCompletions;
    }

    const sourceCompletions = await this.sourceCompletionProvider.provideCompletions(jinjaPartType, jinjaBeforePositionText);
    if (sourceCompletions) {
      console.log(`sourceCompletions: ${sourceCompletions}`);
      return sourceCompletions;
    }

    const macroCompletions = await this.macroCompletionProvider.provideCompletions(jinjaPartType, jinjaBeforePositionText);
    if (macroCompletions) {
      console.log(`macroCompletions: ${macroCompletions}`);
      return macroCompletions;
    }

    console.log('dbt completions not found');
    return undefined;
  }
}
