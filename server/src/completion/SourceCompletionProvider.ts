import { CompletionItem, CompletionParams } from 'vscode-languageserver';

export class SourceCompletionProvider {
  provideCompletions(_completionParams: CompletionParams, _jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    // todo: 1. Provide completions for packages and models.
    // todo: 2. Provide completions for models only from specified package.

    return Promise.resolve(undefined);
  }
}
