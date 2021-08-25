import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ResolvedFunctionCallProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedFunctionCallProto';
import { ResolvedOutputColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedOutputColumnProto';
import { ResolvedQueryStmtProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedQueryStmtProto';
import { ResolvedTableScanProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedTableScanProto';
type actionFunction = (node: any, nodeName?: string) => void;

export class ZetaSQLAST {
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
          if (nodeName === 'resolvedQueryStmtNode') {
            const typedNode = <ResolvedQueryStmtProto>node;
            result.outputColumn = typedNode.outputColumnList?.find(c => c.name === text);
            if (!result.outputColumn && typedNode.outputColumnList?.find(c => c.column?.tableName === text)) {
              result.tableName = text;
            }
          }
          if (nodeName === 'resolvedTableScanNode') {
            const typedNode = <ResolvedTableScanProto>node;
            if (typedNode.table?.fullName === text || typedNode.table?.name === text) {
              result.tableName = typedNode.table?.fullName ?? typedNode.table?.name;
            }
          }
          if (nodeName === 'resolvedFunctionCallNode') {
            const typedNode = <ResolvedFunctionCallProto>node;
            if (typedNode.parent?.function?.name === 'ZetaSQL:' + text) {
              result.function = true;
            }
          }
          if (!nodeName) {
            if ('withQueryName' in node && node.withQueryName === text) {
              result.withQueryName = text;
            }
          }
        },
        ast.resolvedStatement?.node,
      );
    }
    return result;
  }

  traversal(node: any, action: actionFunction, nodeName?: string) {
    action(node, nodeName);
    this.traversalChildren(this.propertyNames, node, action);
  }

  traversalChildren(propertyNames: string[], node: any, action: actionFunction) {
    for (const name of propertyNames) {
      this.traversalChildIfExist(name, node, action);
    }
    if (node.parent) {
      this.traversalChildren(this.propertyNames, node.parent, action);
    }
    if (node.node) {
      this.traversal(node[node.node], action, node.node);
    }
  }

  traversalChildIfExist(propertyName: string, node: any, action: actionFunction) {
    if (propertyName in node) {
      const next = node[propertyName];
      if (next === null) {
        return;
      }
      if (Array.isArray(next)) {
        for (const nextItem of next) {
          this.traversal(nextItem, action);
        }
      } else {
        const nextNodeName = next.node;
        const nextNode = nextNodeName ? node[propertyName][nextNodeName] : next;
        this.traversal(nextNode, action, nextNodeName);
      }
    }
  }
}

export interface HoverInfo {
  outputColumn?: ResolvedOutputColumnProto;
  withQueryName?: string;
  tableName?: string;
  function?: boolean;
}
