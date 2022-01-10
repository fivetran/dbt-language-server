import { SimpleType, TypeKind } from '@fivetrandevelopers/zetasql';
import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ParseLocationRangeProto, ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { ResolvedFunctionCallProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedFunctionCallProto';
import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { ResolvedQueryStmtProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedQueryStmtProto';
import { ResolvedTableScanProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedTableScanProto';

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
        (node: any, nodeName?: string) => {
          if (nodeName === NODE.resolvedQueryStmtNode) {
            const typedNode = <ResolvedQueryStmtProto>node;
            result.outputColumn = typedNode.outputColumnList?.find(c => c.name === text);
            if (!result.outputColumn && typedNode.outputColumnList?.find(c => c.column?.tableName === text)) {
              result.tableName = text;
            }
          }
          if (nodeName === NODE.resolvedTableScanNode) {
            const typedNode = <ResolvedTableScanProto>node;
            if (typedNode.table?.fullName === text || typedNode.table?.name === text) {
              result.tableName = typedNode.table?.fullName ?? typedNode.table?.name;
            }
          }
          if (nodeName === NODE.resolvedFunctionCallNode) {
            const typedNode = <ResolvedFunctionCallProto>node;
            if (typedNode.parent?.function?.name === `ZetaSQL:${text}`) {
              result.function = true;
            }
          }
          if (!nodeName && 'withQueryName' in node && node.withQueryName === text) {
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
      resolvedTables: new Map(),
    };
    const parentNodes: any[] = [];
    const resolvedStatementNode = ast.resolvedStatement && ast.resolvedStatement.node ? ast.resolvedStatement[ast.resolvedStatement.node] : undefined;
    if (resolvedStatementNode) {
      this.traversal(
        resolvedStatementNode,
        (node: any, nodeName?: string) => {
          if (nodeName !== NODE.resolvedTableScanNode) {
            const parseLocationRange = this.getParseLocationRange(node);
            if (parseLocationRange) {
              parentNodes.push({ name: nodeName, parseLocationRange, value: node });
            }
          }

          if (nodeName === NODE.resolvedTableScanNode) {
            const typedNode = <ResolvedTableScanProto>node;
            const { resolvedTables } = completionInfo;
            if (typedNode.table && typedNode.table.fullName) {
              const { fullName } = typedNode.table;
              if (!resolvedTables.get(fullName)) {
                resolvedTables.set(fullName, []);
                typedNode.parent?.columnList?.forEach(column => {
                  if (column.name) {
                    resolvedTables.get(fullName)?.push(column.name);
                  }
                });
              }
            }
          }
        },
        ast.resolvedStatement?.node,
        (node: any, nodeName?: string) => {
          if (parentNodes.length > 0 && completionInfo.activeTableLocationRanges === undefined) {
            const parseLocationRange = this.getParseLocationRange(node);
            const parentNode = parentNodes[parentNodes.length - 1];

            if (nodeName === NODE.resolvedTableScanNode) {
              if (
                parseLocationRange &&
                parentNode.parseLocationRange.start <= parseLocationRange.start &&
                parseLocationRange.end <= parentNode.parseLocationRange.end &&
                parentNode.parseLocationRange.start <= offset &&
                offset <= parentNode.parseLocationRange.end
              ) {
                if (!parentNode.activeTableLocationRanges) {
                  parentNode.activeTableLocationRanges = [];
                  parentNode.activeTables = new Map();
                }
                parentNode.activeTableLocationRanges.push(parseLocationRange);
                if (offset < parseLocationRange?.start || parseLocationRange.end < offset) {
                  const typedNode = <ResolvedTableScanProto>node;
                  const tables = <Map<string, ActiveTableInfo>>parentNode.activeTables;
                  const tableName = typedNode.table?.name;
                  if (tableName && !tables.has(tableName) && typedNode.parent?.columnList) {
                    tables.set(tableName, {
                      alias: typedNode.alias || undefined, // for some tables alias is '' in ast
                      columns: typedNode.parent.columnList.map(
                        c =>
                          <ResolvedColumn>{
                            name: c.name,
                            type: c.type?.typeKind ? new SimpleType(<TypeKind>c.type.typeKind).getTypeName() : undefined,
                          },
                      ),
                    });
                  }
                }
              }
            } else if (
              parentNode.name === nodeName &&
              parseLocationRange?.start === parentNode.parseLocationRange.start &&
              parseLocationRange?.end === parentNode.parseLocationRange.end
            ) {
              const node = parentNodes.pop();
              if (node.activeTableLocationRanges?.length > 0) {
                completionInfo.activeTableLocationRanges = node.activeTableLocationRanges;
                completionInfo.activeTables = node.activeTables;
              }
            }
          }
        },
      );
    }
    return completionInfo;
  }

  isParseLocationRangeExist(parseLocationRange?: ParseLocationRangeProto): boolean {
    return parseLocationRange?.start !== undefined && parseLocationRange.end !== undefined;
  }

  getParseLocationRange(node: any): ParseLocationRangeProto__Output | undefined {
    let { parent } = node;
    while (parent) {
      if (this.isParseLocationRangeExist(parent.parseLocationRange)) {
        return <ParseLocationRangeProto__Output>parent.parseLocationRange;
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
  activeTableLocationRanges?: ParseLocationRangeProto[];
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
