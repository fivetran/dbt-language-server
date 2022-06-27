/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */

import { TypeKind } from '@fivetrandevelopers/zetasql';
import { Type } from '@fivetrandevelopers/zetasql/lib/Type';
import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ParseLocationRangeProto, ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { ResolvedFunctionCallProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedFunctionCallProto';
import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { ResolvedQueryStmtProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedQueryStmtProto';
import { ResolvedTableScanProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedTableScanProto';
import { extractDatasetFromFullName } from './utils/Utils';

export class ZetaSqlAst {
  propertyNames = [
    'aggregateExpressionList',
    'aggregateList',
    'annotations',
    'anonymizationOptionList',
    'argumentList',
    'arguments',
    'arrayExpr',
    'arrayOffsetColumn',
    'assertRowsModified',
    'body',
    'childList',
    'cloneFrom',
    'clusterByList',
    'collationName',
    'columnDefinitionList',
    'columnRef',
    'computedColumnsList',
    'connection',
    'defaultExpression',
    'descriptorArg',
    'elementList',
    'expr',
    'expression',
    'exprList',
    'extendedCast',
    'fieldList',
    'filterExpr',
    'filterFieldArgList',
    'format',
    'forSystemTimeExpr',
    'fromScan',
    'functionExpression',
    'functionGroupList',
    'generatedColumnInfo',
    'genericArgumentList',
    'getFieldList',
    'granteeExprList',
    'groupByColumnList',
    'groupByList',
    'groupingSetList',
    'havingModifier',
    'hintList',
    'indexItemList',
    'inExpr',
    'inlineLambda',
    'inputColumnList',
    'inputItemList',
    'inputScan',
    'joinExpr',
    'kThresholdExpr',
    'leftScan',
    'likeExpr',
    'limit',
    'mergeExpr',
    'model',
    'offset',
    'optionList',
    'orderByItemList',
    'outputColumnList',
    'parameterList',
    'partitionByList',
    'predicate',
    'query',
    'queryParameterList',
    'repeatableArgument',
    'replaceFieldItemList',
    'returning',
    'rightScan',
    'rollupColumnList',
    'rowList',
    'scan',
    'signature',
    'size',
    'sql',
    'statement',
    'storingExpressionList',
    'subquery',
    'tableAndColumnIndexList',
    'tableScan',
    'target',
    'targetTable',
    'timeZone',
    'transformAnalyticFunctionGroupList',
    'transformInputColumnList',
    'transformList',
    'transformOutputColumnList',
    'unnestExpressionsList',
    'usingArgumentList',
    'weightColumn',
    'whenClauseList',
    'whereExpr',
    'windowFrame',
    'withEntryList',
    'withGroupRowsParameterList',
    'withGroupRowsSubquery',
    'withPartitionColumns',
    'withSubquery',
  ];

  getHoverInfo(ast: AnalyzeResponse, text: string): HoverInfo {
    const result: HoverInfo = {};
    const resolvedStatementNode = ast.resolvedStatement && ast.resolvedStatement.node ? ast.resolvedStatement[ast.resolvedStatement.node] : undefined;
    if (resolvedStatementNode) {
      this.traversal(
        resolvedStatementNode,
        (node: unknown, nodeName?: string) => {
          if (nodeName === NODE.resolvedQueryStmtNode) {
            const queryStmtNode = node as ResolvedQueryStmtProto;
            result.outputColumn = queryStmtNode.outputColumnList?.find(c => c.name === text);
            if (!result.outputColumn && queryStmtNode.outputColumnList?.find(c => c.column?.tableName === text)) {
              result.tableName = text;
            }
          }
          if (nodeName === NODE.resolvedTableScanNode) {
            const tableScanNode = node as ResolvedTableScanProto;
            if (tableScanNode.table?.fullName === text || tableScanNode.table?.name === text) {
              result.tableName = tableScanNode.table.fullName ?? tableScanNode.table.name;
            }
          }
          if (nodeName === NODE.resolvedFunctionCallNode) {
            const functionCallNode = node as ResolvedFunctionCallProto;
            if (functionCallNode.parent?.function?.name === `ZetaSQL:${text}`) {
              result.function = true;
            }
          }
          if (!nodeName && (node as { withQueryName?: string }).withQueryName === text) {
            result.withQueryName = text;
          }
        },
        ast.resolvedStatement?.node,
      );
    }
    return result;
  }

  getCompletionInfo(ast: AnalyzeResponse, offset: number): CompletionInfo {
    const completionInfo: CompletionInfo = {
      resolvedTables: new Map<string, string[]>(),
    };

    const parentNodes: {
      name?: string;
      parseLocationRange: ParseLocationRangeProto__Output;
      value: unknown;
      activeTableLocationRanges?: ParseLocationRangeProto__Output[];
      activeTables?: Map<string, ActiveTableInfo>;
    }[] = [];

    const { resolvedStatement } = ast;
    const resolvedStatementNode = resolvedStatement?.node ? resolvedStatement[resolvedStatement.node] : undefined;
    if (resolvedStatementNode) {
      this.traversal(
        resolvedStatementNode,
        (node: unknown, nodeName?: string) => {
          if (nodeName !== NODE.resolvedTableScanNode) {
            const parseLocationRange = this.getParseLocationRange(node);
            if (parseLocationRange) {
              parentNodes.push({ name: nodeName, parseLocationRange, value: node });
            }
          }

          if (nodeName === NODE.resolvedTableScanNode) {
            const typedNode = node as ResolvedTableScanProto;
            const { resolvedTables } = completionInfo;
            if (typedNode.table?.fullName) {
              const { fullName } = typedNode.table;
              if (!resolvedTables.get(fullName)) {
                const columns: string[] = [];
                resolvedTables.set(fullName, columns);
                typedNode.parent?.columnList?.forEach(column => {
                  if (column.name) {
                    columns.push(column.name);
                  }
                });
              }
            }
          }
        },
        resolvedStatement?.node,
        (node: any, nodeName?: string) => {
          if (parentNodes.length > 0 && completionInfo.activeTableLocationRanges === undefined) {
            const parseLocationRange = this.getParseLocationRange(node);
            if (!parseLocationRange) {
              return;
            }
            const parentNode = parentNodes[parentNodes.length - 1];

            if (nodeName === NODE.resolvedTableScanNode) {
              if (
                ZetaSqlAst.rangeContainsRange(parentNode.parseLocationRange, parseLocationRange) &&
                ZetaSqlAst.positionInRange(offset, parentNode.parseLocationRange)
              ) {
                parentNode.activeTableLocationRanges = parentNode.activeTableLocationRanges ?? [];
                parentNode.activeTables = parentNode.activeTables ?? new Map<string, ActiveTableInfo>();
                parentNode.activeTableLocationRanges.push(parseLocationRange);

                if (!ZetaSqlAst.positionInRange(offset, parseLocationRange)) {
                  const tableScanNode: ResolvedTableScanProto = node;
                  const tables = parentNode.activeTables;
                  const tableName = tableScanNode.table?.name;
                  if (tableName && !tables.has(tableName) && tableScanNode.parent?.columnList) {
                    tables.set(tableName, {
                      alias: tableScanNode.alias || undefined, // for some tables alias is '' in ast
                      columns: tableScanNode.parent.columnList.map<ResolvedColumn>(c => ({
                        name: c.name ?? '',
                        type: c.type?.typeKind ? Type.TYPE_KIND_NAMES[c.type.typeKind as TypeKind] : undefined,
                      })),
                    });
                  }
                }
              }
            } else if (parentNode.name === nodeName && ZetaSqlAst.rangesEqual(parseLocationRange, parentNode.parseLocationRange)) {
              const n = parentNodes.pop();
              if (n?.activeTableLocationRanges && n.activeTableLocationRanges.length > 0) {
                completionInfo.activeTableLocationRanges = n.activeTableLocationRanges;
                completionInfo.activeTables = n.activeTables;
              }
            }
          }
        },
      );
    }
    return completionInfo;
  }

  getResolvedTables(ast: AnalyzeResponse, text: string): ResolvedTable[] {
    const result: ResolvedTable[] = [];
    const resolvedStatementNode = ast.resolvedStatement && ast.resolvedStatement.node ? ast.resolvedStatement[ast.resolvedStatement.node] : undefined;
    if (resolvedStatementNode) {
      this.traversal(
        resolvedStatementNode,
        (node: any, nodeName?: string) => {
          if (nodeName === NODE.resolvedTableScanNode) {
            const typedNode: ResolvedTableScanProto = node;
            const name = typedNode.table?.fullName;
            const parseLocationRange = this.requireParseLocationRange(typedNode.parent?.parent?.parseLocationRange);
            if (name && parseLocationRange) {
              try {
                const dataset = extractDatasetFromFullName(text.substring(parseLocationRange.start, parseLocationRange.end), name);
                result.push({
                  schema: dataset,
                  name,
                  location: {
                    start: parseLocationRange.start,
                    end: parseLocationRange.end,
                  },
                });
              } catch (e) {
                console.log(e);
              }
            }
          }
        },
        ast.resolvedStatement?.node,
      );
    }
    return result;
  }

  static positionInRange(position: number, range: ParseLocationRangeProto__Output): boolean {
    return range.start <= position && position <= range.end;
  }

  static rangeContainsRange(outerRange: ParseLocationRangeProto__Output, innerRange: ParseLocationRangeProto__Output): boolean {
    return outerRange.start <= innerRange.start && innerRange.end <= outerRange.end;
  }

  static rangesEqual(range1: ParseLocationRangeProto__Output, range2: ParseLocationRangeProto__Output): boolean {
    return range1.start === range2.start && range1.end === range2.end;
  }

  requireParseLocationRange(parseLocationRange?: ParseLocationRangeProto | null): ParseLocationRangeProto__Output | undefined {
    if (parseLocationRange?.start !== undefined && parseLocationRange.end !== undefined) {
      return parseLocationRange as ParseLocationRangeProto__Output;
    }
    return undefined;
  }

  getParseLocationRange(node: any): ParseLocationRangeProto__Output | undefined {
    let { parent } = node;
    while (parent) {
      const parseLocationRange = this.requireParseLocationRange(parent.parseLocationRange);
      if (parseLocationRange) {
        return parseLocationRange;
      }
      ({ parent } = parent);
    }
    return undefined;
  }

  traversal(node: any, beforeChildrenTraversal: ActionFunction, nodeName?: string, afterChildrenTraversal?: ActionFunction): void {
    beforeChildrenTraversal(node, nodeName);
    this.traversalChildren(this.propertyNames, node, beforeChildrenTraversal, afterChildrenTraversal);
    if (afterChildrenTraversal) {
      afterChildrenTraversal(node, nodeName);
    }
  }

  traversalChildren(propertyNames: string[], node: any, beforeChildrenTraversal: ActionFunction, afterChildrenTraversal?: ActionFunction): void {
    for (const name of propertyNames) {
      this.traversalChildIfExist(name, node, beforeChildrenTraversal, afterChildrenTraversal);
    }
    if (node.parent) {
      this.traversalChildren(this.propertyNames, node.parent, beforeChildrenTraversal, afterChildrenTraversal);
    }
    if (node.node) {
      this.traversal(node[node.node], beforeChildrenTraversal, node.node, afterChildrenTraversal);
    }
  }

  traversalChildIfExist(propertyName: string, node: any, beforeChildrenTraversal: ActionFunction, afterChildrenTraversal?: ActionFunction): void {
    if (propertyName in node) {
      const next = node[propertyName];
      if (next === null) {
        return;
      }
      if (Array.isArray(next)) {
        for (const nextItem of next) {
          this.traversal(nextItem, beforeChildrenTraversal, undefined, afterChildrenTraversal);
        }
      } else {
        const nextNodeName = next.node;
        const nextNode = nextNodeName ? node[propertyName][nextNodeName] : next;
        this.traversal(nextNode, beforeChildrenTraversal, nextNodeName, afterChildrenTraversal);
      }
    }
  }
}

type ActionFunction = (node: any, nodeName?: string) => void;

const NODE = {
  resolvedQueryStmtNode: 'resolvedQueryStmtNode',
  resolvedTableScanNode: 'resolvedTableScanNode',
  resolvedFunctionCallNode: 'resolvedFunctionCallNode',
};

export interface HoverInfo {
  outputColumn?: ResolvedOutputColumnProto;
  withQueryName?: string;
  tableName?: string;
  function?: boolean;
}

export interface CompletionInfo {
  resolvedTables: Map<string, string[]>;
  activeTableLocationRanges?: Location[];
  activeTables?: Map<string, ActiveTableInfo>;
}

export interface ActiveTableInfo {
  alias?: string;
  columns: ResolvedColumn[];
}

export interface ResolvedColumn {
  name: string;
  type?: string;
}

export interface ResolvedTable {
  schema: string;
  name: string;
  location: Location;
}

export interface Location {
  start: number;
  end: number;
}
