import { CompletionItem, CompletionItemKind, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { DestinationDefinition } from './DestinationDefinition';
import { CompletionInfo, ResolvedColumn } from './ZetaSQLAST';

export class CompletionProvider {
  static KEYWORDS = [
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
    'array',
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
    'case',
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
    'date',
    'datetime',
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
    'error',
    'escape',
    'except',
    'exception',
    'exclude',
    'execute',
    'exists',
    'explain',
    'export',
    'external',
    'extract',
    'false',
    'fetch',
    'filter',
    'filter_fields',
    'fill',
    'first',
    'following',
    'for',
    'foreign',
    'format',
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
    'if',
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
    'left',
    'level',
    'like',
    'limit',
    'lookup',
    'loop',
    'match',
    'matched',
    'materialized',
    'max',
    'message',
    'min',
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
    'repeat',
    'repeatable',
    'replace',
    'replace_fields',
    'respect',
    'restrict',
    'return',
    'returns',
    'revoke',
    'right',
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
    'time',
    'timestamp',
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

  static async onCompletion(
    text: string,
    сompletionParams: CompletionParams,
    destinationDefinition: DestinationDefinition,
    completionInfo?: CompletionInfo,
  ): Promise<CompletionItem[]> {
    let result: CompletionItem[] = [];

    if (completionInfo?.activeTableColumns) {
      result.push(...this.getColumnsForActiveTable(completionInfo?.activeTableColumns));
    } else if (сompletionParams.context?.triggerKind !== CompletionTriggerKind.TriggerCharacter) {
      result.push(...this.getDatasets(destinationDefinition));
    }

    if (сompletionParams.context?.triggerKind === CompletionTriggerKind.TriggerCharacter) {
      result.push(...(await this.getTableSuggestions(text, destinationDefinition)));
    } else {
      result.push(...this.getKeywords());
    }

    return result;
  }

  static async onCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
    if (item.kind === CompletionItemKind.Keyword) {
      item.label += ' ';
    }
    return item;
  }

  static getColumnsForActiveTable(columns: Map<string, ResolvedColumn[]>) {
    if (columns.size === 1) {
      const [tableColumns] = columns;
      return tableColumns[1].map(c =>
        CompletionProvider.completionItem(c.name, CompletionItemKind.Value, `${tableColumns[0] ?? ''} ${c.type}`, 1 + c.name),
      );
    }

    if (columns.size > 1) {
      return [...columns.entries()].flatMap(e => {
        const tableName = e[0];
        return e[1].map(column =>
          CompletionProvider.completionItem(
            `${tableName}.${column.name}`,
            CompletionItemKind.Value,
            `${column.type}`,
            1 + `${tableName}.${column.name}`,
          ),
        );
      });
    }
    return [];
  }

  static async getTableSuggestions(datasetName: string, destinationDefinition: DestinationDefinition) {
    const tables = await destinationDefinition.getTables(datasetName);
    return tables
      .filter(t => t.id)
      .map(t => CompletionProvider.completionItem(t.id!, CompletionItemKind.Value, `Table in ${destinationDefinition.activeProject}.${datasetName}`));
  }

  static getDatasets(destinationDefinition: DestinationDefinition): CompletionItem[] {
    return destinationDefinition
      .getDatasets()
      .filter(d => d.id)
      .map(d =>
        CompletionProvider.completionItem(d.id!, CompletionItemKind.Value, `Dataset in ${destinationDefinition.activeProject}`, undefined, ['.']),
      );
  }

  static getKeywords(): CompletionItem[] {
    return CompletionProvider.KEYWORDS.map(k => CompletionProvider.completionItem(k, CompletionItemKind.Keyword, ''));
  }

  static getAllColumnsFromAST(completionInfo: CompletionInfo): CompletionItem[] {
    let result: CompletionItem[] = [];
    for (let [tableName, columnNames] of completionInfo.resolvedTables) {
      columnNames.forEach(c => result.push(CompletionProvider.completionItem(c, CompletionItemKind.Value, `Column in ${tableName}`)));
    }
    return result;
  }

  static completionItem(label: string, kind: CompletionItemKind, detail: string, sortText?: string, commitCharacters?: string[]): CompletionItem {
    return {
      label: label,
      kind: kind,
      detail: detail,
      sortText: sortText,
      commitCharacters: commitCharacters,
    };
  }
}
