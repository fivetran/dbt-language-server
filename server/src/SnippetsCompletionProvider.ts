import { EOL } from 'node:os';
import { Command, CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

export class SnippetsCompletionProvider {
  static readonly SNIPPETS = [
    SnippetsCompletionProvider.createSnippet(
      'ref',
      'dbt Ref',
      '1ref',
      "{{ ref('$0') }}",
      Command.create('triggerSuggest', 'editor.action.triggerSuggest'),
    ),

    SnippetsCompletionProvider.createSnippet(
      'config',
      'dbt Config',
      '1config',
      `{{${EOL}  config(${EOL}    materialized='$\{1|table,view,incremental,ephemeral|}'${EOL}  )${EOL}}}${EOL}`,
    ),

    SnippetsCompletionProvider.createSnippet('if', 'dbt If', '1if', `{% if $\{1:condition} %}${EOL}  $\{2}${EOL}{% endif %}`),
    SnippetsCompletionProvider.createSnippet(
      'ifelse',
      'dbt If-Else',
      '1ifelse',
      `{% if $\{1:condition} %}${EOL}  $\{2}${EOL}{% else %}${EOL}  ${EOL}{% endif %}`,
    ),

    SnippetsCompletionProvider.createSnippet('for', 'dbt For-In', '1for', `{% for $\{1:item} in $\{2:array} %}${EOL}  $\{3}${EOL}{% endfor %}`),

    SnippetsCompletionProvider.createSnippet('macro', 'dbt Macro', '1macro', `{% macro $\{1:name}($\{2:args}) %}${EOL}  $\{3}${EOL}{% endmacro %}`),

    SnippetsCompletionProvider.createSnippet('set', 'dbt Set', '1set', '{% set ${1:var_name} = ${2:value} %}'),
    SnippetsCompletionProvider.createSnippet('setblock', 'dbt Set-Block', '1setblock', `{% set $\{1:name} %}${EOL}  $\{2}${EOL}{% endset %}`),
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
