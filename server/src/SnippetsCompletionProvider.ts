import { Command, CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

export class SnippetsCompletionProvider {
  provideSnippets(text: string): CompletionItem[] {
    const items = [];
    if ('ref'.startsWith(text)) {
      items.push({
        label: 'ref',
        kind: CompletionItemKind.Snippet,
        detail: '{{ ref }}',
        sortText: '1ref',
        insertText: "{{ ref('$0') }}",
        insertTextFormat: InsertTextFormat.Snippet,
        command: Command.create('triggerSuggest', 'editor.action.triggerSuggest'),
      });
    }
    return items;
  }
}
