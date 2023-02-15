import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ASTFunctionCallProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTFunctionCallProto';
import { ASTSelectProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTSelectProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { ParseLocationRangeProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRangeProto';
import { promisify } from 'node:util';
import { arraysAreEqual } from './utils/Utils';
import { traverse } from './utils/ZetaSqlUtils';

export interface KnownColumn {
  namePath: string[];
  parseLocationRange: ParseLocationRangeProto__Output;
}

export interface ParseResult {
  functions: string[][];
  columns: KnownColumn[];
}

export class ZetaSqlParser {
  async getParseResult(sqlStatement: string, options?: LanguageOptionsProto): Promise<ParseResult> {
    const result: ParseResult = {
      functions: [],
      columns: [],
    };
    const parseResult = await this.parse(sqlStatement, options);
    if (parseResult) {
      traverse(
        parseResult.parsedStatement,
        new Map([
          [
            'astFunctionCallNode',
            (node: unknown): void => {
              const typedNode = node as ASTFunctionCallProto__Output;
              const nameParts = typedNode.function?.names.map(n => n.idString);
              if (nameParts && nameParts.length > 1 && !result.functions.some(f => arraysAreEqual(f, nameParts))) {
                result.functions.push(nameParts);
              }
            },
          ],
          [
            'astSelectNode',
            (node: unknown): void => {
              const typedNode = node as ASTSelectProto__Output;
              for (const column of typedNode.selectList?.columns ?? []) {
                if (column.expression?.node === 'astGeneralizedPathExpressionNode') {
                  const pathExpression = column.expression.astGeneralizedPathExpressionNode?.astPathExpressionNode;
                  const parseLocationRange = pathExpression?.parent?.parent?.parent?.parseLocationRange;
                  if (parseLocationRange) {
                    result.columns.push({
                      namePath: pathExpression.names.map(n => n.idString),
                      parseLocationRange,
                    });
                  }
                }
              }
            },
          ],
        ]),
      );
    }
    return result;
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
