import { EOL } from 'node:os';
import { CompletionItemKind, InsertTextFormat } from 'vscode-languageserver';

export const SNIPPET_TESTS = [
  {
    textInDocument: 'r',
    expectedCompletionItems: [
      {
        label: 'ref',
        detail: 'dbt Ref',
        sortText: '2ref',
        insertText: "{{ ref('$0') }}",
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
        command: {
          title: 'triggerSuggest',
          command: 'editor.action.triggerSuggest',
        },
      },
    ],
  },
  {
    textInDocument: 'con',
    expectedCompletionItems: [
      {
        label: 'config',
        detail: 'dbt Config',
        sortText: '2config',
        insertText: `{{${EOL}  config(${EOL}    schema='$1'${EOL}    materialized='$\{2|table,view,incremental,ephemeral|}'${EOL}  )${EOL}}}${EOL}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
  {
    textInDocument: 'i',
    expectedCompletionItems: [
      {
        label: 'if',
        detail: 'dbt If',
        sortText: '2if',
        insertText: `{% if $\{1:condition} %}${EOL}  $\{2}${EOL}{% endif %}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
      {
        label: 'ifelse',
        detail: 'dbt If-Else',
        sortText: '2ifelse',
        insertText: `{% if $\{1:condition} %}${EOL}  $\{2}${EOL}{% else %}${EOL}  ${EOL}{% endif %}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
  {
    textInDocument: 'f',
    expectedCompletionItems: [
      {
        label: 'for',
        detail: 'dbt For-In',
        sortText: '2for',
        insertText: `{% for $\{1:item} in $\{2:array} %}${EOL}  $\{3}${EOL}{% endfor %}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
  {
    textInDocument: 'm',
    expectedCompletionItems: [
      {
        label: 'macro',
        detail: 'dbt Macro',
        sortText: '2macro',
        insertText: `{% macro $\{1:name}($\{2:args}) %}${EOL}  $\{3}${EOL}{% endmacro %}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
  {
    textInDocument: 'se',
    expectedCompletionItems: [
      {
        label: 'set',
        detail: 'dbt Set',
        sortText: '2set',
        insertText: '{% set ${1:var_name} = ${2:value} %}',
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
      {
        label: 'setblock',
        detail: 'dbt Set Block',
        sortText: '2setblock',
        insertText: `{% set $\{1:name} %}${EOL}  $\{2}${EOL}{% endset %}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
  {
    textInDocument: 'st',
    expectedCompletionItems: [
      {
        label: 'statement',
        detail: 'dbt Statement Blocks',
        sortText: '2statement',
        insertText: `{% call statement($\{1:name}, fetch_result=$\{2|True,False|}) %}${EOL}  $\{3}${EOL}{% endcall %}`,
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
  {
    textInDocument: 'so',
    expectedCompletionItems: [
      {
        label: 'source',
        detail: 'dbt Source',
        sortText: '2source',
        insertText: "{{ source('$1', '$2') }}",
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
        command: {
          title: 'triggerSuggest',
          command: 'editor.action.triggerSuggest',
        },
      },
    ],
  },
  {
    textInDocument: 'b',
    expectedCompletionItems: [
      {
        label: 'block',
        detail: 'dbt Block',
        sortText: '2block',
        insertText: '{% $1 %}',
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
  {
    textInDocument: 'com',
    expectedCompletionItems: [
      {
        label: 'comment',
        detail: 'dbt Comment',
        sortText: '2comment',
        insertText: '{# $1 #}',
        insertTextFormat: InsertTextFormat.Snippet,
        kind: CompletionItemKind.Snippet,
      },
    ],
  },
];
