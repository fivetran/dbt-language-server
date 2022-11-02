import { EOL } from 'node:os';
import { Command, CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

export class SnippetsCompletionProvider {
  static readonly SNIPPETS = [
    SnippetsCompletionProvider.createSnippet(
      'ref',
      '{{ ref }}',
      '1ref',
      "{{ ref('$0') }}",
      Command.create('triggerSuggest', 'editor.action.triggerSuggest'),
    ),
    SnippetsCompletionProvider.createSnippet(
      'config',
      '{{ config }}',
      '1config',
      `{{${EOL}  config(${EOL}    materialized='$\{1|table,view,incremental,ephemeral|}'${EOL}  )${EOL}}}${EOL}`,
    ),
  ];

  static createSnippet(label: string, detail: string, sortText: string, insertText: string, command?: Command): CompletionItem {
    return {
      label,
      kind: CompletionItemKind.Snippet,
      detail,
      sortText,
      insertText,
      insertTextFormat: InsertTextFormat.Snippet,
      command,
    };
  }

  provideSnippets(text: string): CompletionItem[] {
    return SnippetsCompletionProvider.SNIPPETS.filter(s => s.label.startsWith(text.toLocaleLowerCase()));
  }
}
