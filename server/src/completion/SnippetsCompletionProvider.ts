import { EOL } from 'node:os';
import { Command, CompletionItem, CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

export class SnippetsCompletionProvider {
  static readonly SNIPPETS = [
    SnippetsCompletionProvider.createSnippet('ref', 'dbt Ref', "{{ ref('$0') }}", Command.create('triggerSuggest', 'editor.action.triggerSuggest')),

    SnippetsCompletionProvider.createSnippet(
      'config',
      'dbt Config',
      `{{${EOL}  config(${EOL}    schema='$1'${EOL}    materialized='$\{2|table,view,incremental,ephemeral|}'${EOL}  )${EOL}}}${EOL}`,
    ),

    SnippetsCompletionProvider.createSnippet('if', 'dbt If', `{% if $\{1:condition} %}${EOL}  $\{2}${EOL}{% endif %}`),
    SnippetsCompletionProvider.createSnippet(
      'ifelse',
      'dbt If-Else',
      `{% if $\{1:condition} %}${EOL}  $\{2}${EOL}{% else %}${EOL}  ${EOL}{% endif %}`,
    ),

    SnippetsCompletionProvider.createSnippet('for', 'dbt For-In', `{% for $\{1:item} in $\{2:array} %}${EOL}  $\{3}${EOL}{% endfor %}`),

    SnippetsCompletionProvider.createSnippet('macro', 'dbt Macro', `{% macro $\{1:name}($\{2:args}) %}${EOL}  $\{3}${EOL}{% endmacro %}`),

    SnippetsCompletionProvider.createSnippet('set', 'dbt Set', '{% set ${1:var_name} = ${2:value} %}'),
    SnippetsCompletionProvider.createSnippet('setblock', 'dbt Set Block', `{% set $\{1:name} %}${EOL}  $\{2}${EOL}{% endset %}`),

    SnippetsCompletionProvider.createSnippet(
      'statement',
      'dbt Statement Blocks',
      `{% call statement($\{1:name}, fetch_result=$\{2|True,False|}) %}${EOL}  $\{3}${EOL}{% endcall %}`,
    ),

    SnippetsCompletionProvider.createSnippet(
      'source',
      'dbt Source',
      "{{ source('$1', '$2') }}",
      Command.create('triggerSuggest', 'editor.action.triggerSuggest'),
    ),

    SnippetsCompletionProvider.createSnippet('block', 'dbt Block', '{% $1 %}'),
    SnippetsCompletionProvider.createSnippet('comment', 'dbt Comment', '{# $1 #}'),
  ];

  static createSnippet(label: string, detail: string, insertText: string, command?: Command): CompletionItem {
    return {
      label,
      kind: CompletionItemKind.Snippet,
      detail,
      sortText: `2${label}`,
      insertText,
      insertTextFormat: InsertTextFormat.Snippet,
      command,
    };
  }

  provideSnippets(text: string): CompletionItem[] {
    return SnippetsCompletionProvider.SNIPPETS.filter(s => s.label.startsWith(text.toLocaleLowerCase()));
  }
}
