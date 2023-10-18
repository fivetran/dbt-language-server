import { ASTAliasProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTAliasProto';
import { ASTFunctionCallProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTFunctionCallProto';
import { ASTSelectProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTSelectProto';
import { ASTTablePathExpressionProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTTablePathExpressionProto';
import { AnyASTExpressionProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/AnyASTExpressionProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { ZetaSqlApi } from './ZetaSqlApi';
import { arraysAreEqual } from './utils/Utils';
import { traverse } from './utils/ZetaSqlUtils';

interface KnownSelect {
  parseLocationRange: ParseLocationRangeProto__Output;
  columns: KnownColumn[];
  tableAliases: Map<string, string>;
  fromClause?: {
    parseLocationRange: ParseLocationRangeProto__Output;
  };
  isNested: boolean;
}
interface KnownColumn {
  namePath: string[];
  parseLocationRange: ParseLocationRangeProto__Output;
  alias?: {
    id: string;
    parseLocationRange: ParseLocationRangeProto__Output;
  };
  canBeTarget: boolean;
}

export interface ParseResult {
  functions: string[][];
  selects: KnownSelect[];
}

export class ZetaSqlParser {
  constructor(private readonly zetaSqlApi: ZetaSqlApi) {}

  async getParseResult(sqlStatement: string, options?: LanguageOptionsProto): Promise<ParseResult> {
    const result: ParseResult = {
      functions: [],
      selects: [],
    };
    const parseResult = await this.parse(sqlStatement, options);
    const parentSelect: KnownSelect[] = [];
    if (parseResult) {
      traverse(
        parseResult.parsedStatement,
        new Map([
          [
            'astFunctionCallNode',
            {
              actionBefore: (node: unknown): void => {
                const typedNode = node as ASTFunctionCallProto__Output;
                const nameParts = typedNode.function?.names.map(n => n.idString);
                if (nameParts && nameParts.length > 1 && !result.functions.some(f => arraysAreEqual(f, nameParts))) {
                  result.functions.push(nameParts);
                }
              },
            },
          ],
          [
            'astSelectNode',
            {
              actionBefore: (node: unknown): void => {
                const typedNode = node as ASTSelectProto__Output;
                const selectParseLocationRange = typedNode.parent?.parent?.parseLocationRange;
                if (selectParseLocationRange) {
                  const select: KnownSelect = {
                    columns: [],
                    parseLocationRange: selectParseLocationRange,
                    tableAliases: new Map(),
                    fromClause: typedNode.fromClause?.parent?.parseLocationRange
                      ? {
                          parseLocationRange: typedNode.fromClause.parent.parseLocationRange,
                        }
                      : undefined,
                    isNested: parentSelect.length > 0,
                  };
                  parentSelect.push(select);
                  result.selects.push(select);

                  typedNode.selectList?.columns.forEach(c => select.columns.push(...this.getColumns(c.expression, true, c.alias ?? undefined)));
                }
              },
              actionAfter: () => parentSelect.pop(),
            },
          ],
          [
            'astTablePathExpressionNode',
            {
              actionBefore: (node: unknown): void => {
                const typedNode = node as ASTTablePathExpressionProto__Output;
                const activeSelect = parentSelect.at(-1);
                if (activeSelect) {
                  const name = typedNode.pathExpr?.names.at(-1)?.idString;
                  const alias = typedNode.alias?.identifier?.idString;
                  if (name && alias) {
                    activeSelect.tableAliases.set(name, alias);
                  }
                } else {
                  console.log('activeSelect not found');
                }
              },
            },
          ],
        ]),
      );
    }
    return result;
  }

  getColumns(node: AnyASTExpressionProto__Output | null, canBeTarget: boolean, alias?: ASTAliasProto__Output): KnownColumn[] {
    if (!node) {
      return [];
    }
    const nodeName = node.node;
    const columns: KnownColumn[] = [];
    switch (nodeName) {
      case 'astAnalyticFunctionCallNode': {
        const analyticFunction = node.astAnalyticFunctionCallNode;
        if (analyticFunction) {
          columns.push(...this.getColumns(analyticFunction.expression, false));
          analyticFunction.windowSpec?.partitionBy?.partitioningExpressions.forEach(p => columns.push(...this.getColumns(p, false, alias)));
          analyticFunction.windowSpec?.orderBy?.orderingExpressions.forEach(p => columns.push(...this.getColumns(p.expression, false, alias)));
        }
        break;
      }
      case 'astGeneralizedPathExpressionNode': {
        const pathExpression = node.astGeneralizedPathExpressionNode?.astPathExpressionNode;
        if (pathExpression) {
          const parseLocationRange = pathExpression.parent?.parent?.parent?.parseLocationRange;
          if (parseLocationRange) {
            columns.push(
              this.createColumn(
                pathExpression.names.map(n => n.idString),
                parseLocationRange,
                canBeTarget,
                alias,
              ),
            );
          }
        }

        const arrayElement = node.astGeneralizedPathExpressionNode?.astArrayElementNode;
        if (arrayElement) {
          columns.push(...this.getColumns(arrayElement.array, canBeTarget, alias));
        }
        break;
      }
      case 'astLeafNode': {
        const leafNode = node.astLeafNode;
        if (leafNode) {
          const valueNode = leafNode[leafNode.node];
          const parseLocationRange = valueNode?.parent?.parent?.parent?.parseLocationRange;
          if (parseLocationRange) {
            columns.push(this.createColumn([], parseLocationRange, canBeTarget, alias));
          }
        }
        break;
      }
      case 'astFunctionCallNode': {
        const functionCallNode = node.astFunctionCallNode;
        functionCallNode?.arguments.forEach(c => columns.push(...this.getColumns(c, false, alias)));
        functionCallNode?.orderBy?.orderingExpressions.forEach(c => columns.push(...this.getColumns(c.expression, false, alias)));
        break;
      }
      case 'astBinaryExpressionNode': {
        if (node.astBinaryExpressionNode) {
          columns.push(
            ...this.getColumns(node.astBinaryExpressionNode.lhs, canBeTarget, alias),
            ...this.getColumns(node.astBinaryExpressionNode.rhs, canBeTarget, alias),
          );
        }
        break;
      }
      case 'astInExpressionNode': {
        if (node.astInExpressionNode) {
          columns.push(...this.getColumns(node.astInExpressionNode.lhs, false, alias));
        }
        if (node.astInExpressionNode?.inList) {
          node.astInExpressionNode.inList.list.forEach(c => columns.push(...this.getColumns(c, false, alias)));
        }
        break;
      }
      case 'astAndExprNode': {
        node.astAndExprNode?.conjuncts.forEach(c => columns.push(...this.getColumns(c, false, alias)));
        break;
      }
      case 'astOrExprNode': {
        node.astOrExprNode?.disjuncts.forEach(c => columns.push(...this.getColumns(c, false, alias)));
        break;
      }
      case 'astUnaryExpressionNode': {
        if (node.astUnaryExpressionNode) {
          columns.push(...this.getColumns(node.astUnaryExpressionNode.operand, false, alias));
        }
        break;
      }
      case 'astArrayConstructorNode': {
        node.astArrayConstructorNode?.elements.forEach(c => columns.push(...this.getColumns(c, false, alias)));
        break;
      }
      case 'astBetweenExpressionNode': {
        if (node.astBetweenExpressionNode) {
          columns.push(
            ...this.getColumns(node.astBetweenExpressionNode.lhs, false, alias),
            ...this.getColumns(node.astBetweenExpressionNode.low, false, alias),
            ...this.getColumns(node.astBetweenExpressionNode.high, false, alias),
          );
        }
        break;
      }
      case 'astCaseNoValueExpressionNode': {
        node.astCaseNoValueExpressionNode?.arguments.forEach(c => columns.push(...this.getColumns(c, false, alias)));
        break;
      }
      case 'astCaseValueExpressionNode': {
        node.astCaseValueExpressionNode?.arguments.forEach(c => columns.push(...this.getColumns(c, false, alias)));
        break;
      }
      case 'astCastExpressionNode': {
        if (node.astCastExpressionNode) {
          columns.push(...this.getColumns(node.astCastExpressionNode.expr, false, alias));
        }
        break;
      }
      case 'astBitwiseShiftExpressionNode': {
        if (node.astBitwiseShiftExpressionNode) {
          columns.push(
            ...this.getColumns(node.astBitwiseShiftExpressionNode.lhs, false, alias),
            ...this.getColumns(node.astBitwiseShiftExpressionNode.rhs, false, alias),
          );
        }
        break;
      }
      case 'astBracedConstructorFieldValueNode': {
        if (node.astBracedConstructorFieldValueNode) {
          columns.push(...this.getColumns(node.astBracedConstructorFieldValueNode.expression, false, alias));
        }
        break;
      }
      case 'astLikeExpressionNode': {
        if (node.astLikeExpressionNode) {
          columns.push(...this.getColumns(node.astLikeExpressionNode.lhs, false, alias));
        }
        break;
      }
      default: {
        break;
      }
    }
    return columns;
  }

  private createColumn(
    namePath: string[],
    parseLocationRange: ParseLocationRangeProto__Output,
    canBeTarget: boolean,
    alias?: ASTAliasProto__Output,
  ): KnownColumn {
    return {
      namePath,
      parseLocationRange,
      alias:
        alias?.identifier && alias.parent?.parseLocationRange
          ? {
              id: alias.identifier.idString,
              parseLocationRange: alias.parent.parseLocationRange,
            }
          : undefined,
      canBeTarget,
    };
  }

  async parse(sqlStatement: string, options?: LanguageOptionsProto): Promise<ParseResponse__Output | undefined> {
    try {
      return await this.zetaSqlApi.parse(sqlStatement, options);
    } catch (e) {
      if (!(e instanceof Error)) {
        console.log(e);
      }
    }
    return undefined;
  }
}
