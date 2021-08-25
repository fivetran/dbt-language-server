import { CompletionItem, CompletionItemKind, CompletionParams } from 'vscode-languageserver';
import { DestinationDefinition } from './DestinationDefinition';

export class CompletionProvider {
  static async onCompletion(сompletionParams: CompletionParams, destinationDefinition: DestinationDefinition): Promise<CompletionItem[]> {
    return destinationDefinition.datasets?.map(d => <CompletionItem>{ label: d.id, kind: CompletionItemKind.Keyword }) ?? [];
  }

  static async onCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
    return item;
  }
}
