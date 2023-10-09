import { Command, CompletionItem, CompletionItemKind, CompletionParams, CompletionTriggerKind, InsertTextFormat } from 'vscode-languageserver';
import { DestinationDefinition } from '../DestinationDefinition';
import { HelpProviderWords } from '../HelpProviderWords';
import { SupportedDestinations } from '../ZetaSqlApi';
import { ActiveTableInfo, CompletionInfo, WithSubqueryInfo } from '../ZetaSqlAst';
import { CompletionTextInput } from './CompletionProvider';

export class SqlCompletionProvider {
  static readonly BQ_KEYWORDS = [
    'abort',
    'access',
    'action',
    'add',
    'aggregate',
    'all',
    'alter',
    'analyze',
    'and',
    'anonymization',
    'any',
    'as',
    'asc',
    'assert',
    'assert_rows_modified',
    'at',
    'batch',
    'begin',
    'between',
    'bigdecimal',
    'bignumeric',
    'break',
    'by',
    'call',
    'cascade',
    'cast',
    'check',
    'clamped',
    'cluster',
    'collate',
    'column',
    'columns',
    'commit',
    'connection',
    'constant',
    'constraint',
    'contains',
    'continue',
    'clone',
    'create',
    'cross',
    'cube',
    'current',
    'data',
    'database',
    'decimal',
    'declare',
    'default',
    'define',
    'definer',
    'delete',
    'desc',
    'describe',
    'descriptor',
    'deterministic',
    'distinct',
    'do',
    'drop',
    'else',
    'elseif',
    'end',
    'enforced',
    'enum',
    'escape',
    'except',
    'exception',
    'exclude',
    'execute',
    'exists',
    'explain',
    'export',
    'external',
    'false',
    'fetch',
    'filter',
    'filter_fields',
    'fill',
    'first',
    'following',
    'for',
    'foreign',
    'from',
    'full',
    'function',
    'generated',
    'grant',
    'group',
    'group_rows',
    'grouping',
    'groups',
    'hash',
    'having',
    'hidden',
    'ignore',
    'immediate',
    'immutable',
    'import',
    'in',
    'include',
    'inout',
    'index',
    'inner',
    'insert',
    'intersect',
    'interval',
    'iterate',
    'into',
    'invoker',
    'is',
    'isolation',
    'join',
    'json',
    'key',
    'language',
    'last',
    'lateral',
    'leave',
    'level',
    'like',
    'limit',
    'lookup',
    'loop',
    'match',
    'matched',
    'materialized',
    'message',
    'model',
    'module',
    'merge',
    'natural',
    'new',
    'no',
    'not',
    'null',
    'nulls',
    'numeric',
    'of',
    'offset',
    'on',
    'only',
    'options',
    'or',
    'order',
    'out',
    'outer',
    'over',
    'partition',
    'percent',
    'pivot',
    'unpivot',
    'policies',
    'policy',
    'primary',
    'preceding',
    'procedure',
    'private',
    'privileges',
    'proto',
    'public',
    'qualify',
    'raise',
    'range',
    'read',
    'recursive',
    'references',
    'rename',
    'repeatable',
    'replace_fields',
    'respect',
    'restrict',
    'return',
    'returns',
    'revoke',
    'rollback',
    'rollup',
    'row',
    'rows',
    'run',
    'safe_cast',
    'schema',
    'search',
    'security',
    'select',
    'set',
    'show',
    'simple',
    'some',
    'source',
    'storing',
    'sql',
    'stable',
    'start',
    'stored',
    'struct',
    'system',
    'system_time',
    'table',
    'tablesample',
    'target',
    'temp',
    'temporary',
    'then',
    'to',
    'transaction',
    'transform',
    'treat',
    'true',
    'truncate',
    'type',
    'unbounded',
    'union',
    'unnest',
    'unique',
    'until',
    'update',
    'using',
    'value',
    'values',
    'volatile',
    'view',
    'views',
    'weight',
    'when',
    'where',
    'while',
    'window',
    'with',
    'within',
    'write',
    'zone',
  ];

  async onSqlCompletion(
    text: CompletionTextInput,
    completionParams: CompletionParams,
    destinationDefinition?: DestinationDefinition,
    completionInfo?: CompletionInfo,
    destination?: SupportedDestinations,
    aliases?: Map<string, string>,
  ): Promise<CompletionItem[]> {
    const result: CompletionItem[] = [];
    const columnsOnly = completionParams.context?.triggerKind === CompletionTriggerKind.TriggerCharacter || text[1] !== undefined;

    if (completionInfo && completionInfo.activeTables.length > 0) {
      if (columnsOnly) {
        result.push(...this.getColumnsForActiveTable(text[0], completionInfo.activeTables));
      } else {
        result.push(...this.getColumnsForActiveTables(completionInfo.activeTables));
      }
    } else if (completionParams.context?.triggerKind !== CompletionTriggerKind.TriggerCharacter) {
      result.push(...this.getDatasets(destinationDefinition));
    }

    if (completionInfo && completionInfo.withNames.size > 0) {
      result.push(...this.getColumnsForWithQueries(completionInfo.withSubqueries, columnsOnly, aliases, text[0]));
    }

    if (columnsOnly) {
      result.push(...(await this.getTableSuggestions(text[1] || text[0], destinationDefinition)));
    } else if (destination !== 'snowflake') {
      result.push(...this.getKeywords(), ...this.getFunctions());
    }

    return result;
  }

  getColumnsForWithQueries(
    withQueries: Map<string, WithSubqueryInfo>,
    columnsOnly: boolean,
    aliases?: Map<string, string>,
    text?: string,
  ): CompletionItem[] {
    return [...withQueries.entries()].flatMap(([w, q]) => {
      const name = aliases?.get(w) || w;

      if (w === '___mainQuery') {
        return [];
      }

      if (columnsOnly && name === text) {
        return q.columns.map(c => ({
          label: `${c.name}`,
          kind: CompletionItemKind.Value,
          detail: `${String(c.type)}`,
          sortText: `1${c.name}`,
        }));
      }
      if (!columnsOnly) {
        return q.columns.map(c => ({
          label: `${name}.${c.name}`,
          kind: CompletionItemKind.Value,
          detail: `${String(c.type)}`,
          sortText: `1${name}.${c.name}`,
        }));
      }
      return [];
    });
  }

  getColumnsForActiveTables(tables: ActiveTableInfo[]): CompletionItem[] {
    if (tables.length === 1) {
      const [tableInfo] = tables;
      return tableInfo.columns.map<CompletionItem>(c => ({
        label: c.name,
        kind: CompletionItemKind.Value,
        detail: `${tableInfo.name} ${String(c.type)}`,
        sortText: `1${c.name}`,
      }));
    }

    if (tables.length > 1) {
      return tables.flatMap(table => {
        const { name, alias } = table;
        return table.columns.map<CompletionItem>(column => ({
          label: `${alias || name}.${column.name}`,
          kind: CompletionItemKind.Value,
          detail: `${String(column.type)}`,
          sortText: `1${alias || name}.${column.name}`,
        }));
      });
    }
    return [];
  }

  getColumnsForActiveTable(text: string, tables: ActiveTableInfo[]): CompletionItem[] {
    for (const table of tables) {
      if (text === table.name || text === table.alias) {
        return table.columns.map<CompletionItem>(column => ({
          label: `${column.name}`,
          kind: CompletionItemKind.Value,
          detail: `${table.name} ${String(column.type)}`,
          sortText: `1${column.name}`,
        }));
      }
    }
    return [];
  }

  async getTableSuggestions(datasetName: string, destinationDefinition?: DestinationDefinition): Promise<CompletionItem[]> {
    if (!destinationDefinition) {
      return [];
    }

    const tables = await destinationDefinition.getTables(datasetName);
    return tables.map<CompletionItem>(t => ({
      label: t.id,
      kind: CompletionItemKind.Value,
      detail: `Table in ${destinationDefinition.activeProject}.${datasetName}`,
    }));
  }

  getDatasets(destinationDefinition?: DestinationDefinition): CompletionItem[] {
    return destinationDefinition
      ? destinationDefinition.getDatasets().map<CompletionItem>(d => ({
          label: d.id,
          kind: CompletionItemKind.Value,
          detail: `Dataset in ${destinationDefinition.activeProject}`,
          commitCharacters: ['.'],
        }))
      : [];
  }

  getKeywords(): CompletionItem[] {
    return SqlCompletionProvider.BQ_KEYWORDS.map<CompletionItem>(k => ({
      label: k,
      kind: CompletionItemKind.Keyword,
      insertText: `${k} `,
      sortText: `3${k}`,
      detail: '',
    }));
  }

  getFunctions(): CompletionItem[] {
    return HelpProviderWords.map<CompletionItem>(w => ({
      label: w.name,
      kind: CompletionItemKind.Function,
      detail: w.signatures[0].signature,
      documentation: w.signatures[0].description,
      insertTextFormat: InsertTextFormat.Snippet,
      insertText: `${w.name}($0)`,
      sortText: `2${w.name}($0)`,
      command: Command.create('triggerParameterHints', 'editor.action.triggerParameterHints'),
    }));
  }
}
