import { CompletionItem, CompletionParams } from 'vscode-languageserver';

export class MacroCompletionProvider {
  provideCompletions(_completionParams: CompletionParams, _jinjaBeforePositionText: string): Promise<CompletionItem[] | undefined> {
    // todo: 1. Provide completions for packages and macros.
    // todo: 2. Provide completions for macros only from specified package.

    return Promise.resolve(undefined);
  }
}
