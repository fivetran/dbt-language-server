import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { AnyASTExpressionProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/AnyASTExpressionProto';
import { ASTFunctionCallProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTFunctionCallProto';
import { ASTSelectProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTSelectProto';
import { ASTTablePathExpressionProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTTablePathExpressionProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { promisify } from 'node:util';
import { arraysAreEqual } from './utils/Utils';
import { traverse } from './utils/ZetaSqlUtils';

export interface KnownSelect {
  parseLocationRange: ParseLocationRangeProto__Output;
  columns: KnownColumn[];
  tableAliases: Map<string, string>;
}
export interface KnownColumn {
  namePath: string[];
  parseLocationRange: ParseLocationRangeProto__Output;
}

export interface ParseResult {
  functions: string[][];
  selects: KnownSelect[];
}

export class ZetaSqlParser {
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
                  };
                  parentSelect.push(select);
                  result.selects.push(select);

                  typedNode.selectList?.columns.forEach(c => select.columns.push(...this.getColumns(c.expression)));
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

  getColumns(node: AnyASTExpressionProto__Output | null): KnownColumn[] {
    if (!node) {
      return [];
    }
    const nodeName = node.node;
    const columns: KnownColumn[] = [];
    switch (nodeName) {
      case 'astGeneralizedPathExpressionNode': {
        const pathExpression = node.astGeneralizedPathExpressionNode?.astPathExpressionNode;
        const parseLocationRange = pathExpression?.parent?.parent?.parent?.parseLocationRange;
        if (parseLocationRange) {
          columns.push({
            namePath: pathExpression.names.map(n => n.idString),
            parseLocationRange,
          });
        }
        break;
      }
      case 'astFunctionCallNode': {
        node.astFunctionCallNode?.arguments.forEach(c => columns.push(...this.getColumns(c)));
        break;
      }
      case 'astDotStarWithModifiersNode': {
        node.astDotStarWithModifiersNode?.modifiers?.exceptList?.identifiers.forEach(i => {
          if (i.parent?.parent?.parseLocationRange) {
            columns.push({
              namePath: [i.idString],
              parseLocationRange: i.parent.parent.parseLocationRange,
            });
          }
        });
        break;
      }
      case 'astBinaryExpressionNode': {
        if (node.astBinaryExpressionNode?.lhs) {
          columns.push(...this.getColumns(node.astBinaryExpressionNode.lhs));
        }
        break;
      }
      default: {
        break;
      }
    }
    return columns;
  }

  async parse(sqlStatement: string, options?: LanguageOptionsProto): Promise<ParseResponse__Output | undefined> {
    const parse = promisify(ZetaSQLClient.API.parse.bind(ZetaSQLClient.API));
    try {
      return await parse({
        sqlStatement,
        options,
      });
    } catch (e) {
      console.log(e);
    }
    return undefined;
  }
}
