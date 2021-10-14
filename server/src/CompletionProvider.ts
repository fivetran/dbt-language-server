import { Command, CompletionItem, CompletionItemKind, CompletionParams, CompletionTriggerKind } from 'vscode-languageserver';
import { DestinationDefinition } from './DestinationDefinition';
import { HelpProviderWords } from './HelpProviderWords';
import { ActiveTableInfo, CompletionInfo } from './ZetaSQLAST';

export class CompletionProvider {
  static readonly ENDS_WITH_REF = /ref\([^)]*$/;
  static readonly ENDS_WITH_QUOTE = /['|"]$/;
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

  static readonly DBT_KEYWORDS = ['ref'];

  dbtModels: string[] = [];

  onJinjaCompletion(textBeforeCursor: string): CompletionItem[] {
    if (textBeforeCursor.match(CompletionProvider.ENDS_WITH_REF)) {
      const edsWithQoute = textBeforeCursor.match(CompletionProvider.ENDS_WITH_QUOTE);
      return this.dbtModels.map(
        m =>
          <CompletionItem>{
            label: edsWithQoute ? m : `'${m}'`,
            kind: CompletionItemKind.Value,
            detail: 'Model',
          },
      );
    }
    return [];
  }

  async onSqlCompletion(
    text: string,
    сompletionParams: CompletionParams,
    destinationDefinition: DestinationDefinition,
    completionInfo?: CompletionInfo,
  ): Promise<CompletionItem[]> {
    let result: CompletionItem[] = [];

    if (completionInfo?.activeTables) {
      if (сompletionParams.context?.triggerKind === CompletionTriggerKind.TriggerCharacter) {
        result.push(...this.getColumnsForActiveTable(text, completionInfo?.activeTables));
      } else {
        result.push(...this.getColumnsForActiveTables(completionInfo?.activeTables));
      }
    } else if (сompletionParams.context?.triggerKind !== CompletionTriggerKind.TriggerCharacter) {
      result.push(...this.getDatasets(destinationDefinition));
    }

    if (сompletionParams.context?.triggerKind === CompletionTriggerKind.TriggerCharacter) {
      result.push(...(await this.getTableSuggestions(text, destinationDefinition)));
    } else {
      result.push(...this.getKeywords());
      result.push(...this.getFunctions());
    }

    return result;
  }

  async onCompletionResolve(item: CompletionItem): Promise<CompletionItem> {
    if (item.kind === CompletionItemKind.Keyword) {
      item.label += ' ';
    }
    if (item.kind === CompletionItemKind.Function) {
      item.label += '()';
      item.command = Command.create('additional', 'editor.afterFunctionCompletion');
    }
    return item;
  }

  getColumnsForActiveTables(tables: Map<string, ActiveTableInfo>) {
    if (tables.size === 1) {
      const [tableInfo] = tables;
      return tableInfo[1].columns.map(
        c =>
          <CompletionItem>{
            label: c.name,
            kind: CompletionItemKind.Value,
            detail: `${tableInfo[0] ?? ''} ${c.type}`,
            sortText: 1 + c.name,
          },
      );
    }

    if (tables.size > 1) {
      return [...tables.entries()].flatMap(e => {
        const tableName = e[0];
        return e[1].columns.map(
          column =>
            <CompletionItem>{
              label: `${tableName}.${column.name}`,
              kind: CompletionItemKind.Value,
              detail: `${column.type}`,
              sortText: 1 + `${tableName}.${column.name}`,
            },
        );
      });
    }
    return [];
  }

  getColumnsForActiveTable(text: string, tables: Map<string, ActiveTableInfo>): CompletionItem[] {
    for (const [tableName, tableInfo] of tables) {
      if (text === tableName || text === tableInfo.alias) {
        return tableInfo.columns.map(
          column =>
            <CompletionItem>{
              label: `${column.name}`,
              kind: CompletionItemKind.Value,
              detail: `${tableName} ${column.type}`,
              sortText: 1 + `${column.name}`,
            },
        );
      }
    }
    return [];
  }

  async getTableSuggestions(datasetName: string, destinationDefinition: DestinationDefinition) {
    const tables = await destinationDefinition.getTables(datasetName);
    return tables
      .filter(t => t.id)
      .map(
        t =>
          <CompletionItem>{
            label: t.id!,
            kind: CompletionItemKind.Value,
            detail: `Table in ${destinationDefinition.activeProject}.${datasetName}`,
          },
      );
  }

  getDatasets(destinationDefinition: DestinationDefinition): CompletionItem[] {
    return destinationDefinition
      .getDatasets()
      .filter(d => d.id)
      .map(
        d =>
          <CompletionItem>{
            label: d.id!,
            kind: CompletionItemKind.Value,
            detail: `Dataset in ${destinationDefinition.activeProject}`,
            commitCharacters: ['.'],
          },
      );
  }

  getKeywords(): CompletionItem[] {
    return CompletionProvider.BQ_KEYWORDS.map(
      k =>
        <CompletionItem>{
          label: k,
          kind: CompletionItemKind.Keyword,
          detail: '',
        },
    );
  }

  getFunctions(): CompletionItem[] {
    return HelpProviderWords.map(
      w =>
        <CompletionItem>{
          label: w.name,
          kind: CompletionItemKind.Function,
          detail: w.sinatures[0].signature,
          documentation: w.sinatures[0].description,
        },
    );
  }

  getAllColumnsFromAST(completionInfo: CompletionInfo): CompletionItem[] {
    let result: CompletionItem[] = [];
    for (let [tableName, columnNames] of completionInfo.resolvedTables) {
      columnNames.forEach(c =>
        result.push(<CompletionItem>{
          label: c,
          kind: CompletionItemKind.Value,
          detail: `Column in ${tableName}`,
        }),
      );
    }
    return result;
  }

  setDbtModels(dbtModels: string[]) {
    this.dbtModels = dbtModels;
  }
}
