import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ASTFunctionCallProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTFunctionCallProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { promisify } from 'node:util';
import { arraysAreEqual } from './utils/Utils';
import { traverse } from './utils/ZetaSqlUtils';

export interface ParseResult {
  functions: string[][];
}

export class ZetaSqlParser {
  async getParseResult(sqlStatement: string, options?: LanguageOptionsProto): Promise<ParseResult> {
    const functions: string[][] = [];
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
              if (nameParts && nameParts.length > 1 && !functions.some(f => arraysAreEqual(f, nameParts))) {
                functions.push(nameParts);
              }
            },
          ],
        ]),
      );
    }
    return { functions };
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
