import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ASTFunctionCallProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTFunctionCallProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { promisify } from 'node:util';
import { arraysAreEqual } from './utils/Utils';
import { traverse } from './utils/ZetaSqlUtils';

export class ZetaSqlParser {
  async getAllFunctionCalls(sqlStatement: string, options?: LanguageOptionsProto): Promise<string[][]> {
    const functions: string[][] = [];
    const parseResult = await this.parse(sqlStatement, options);
    if (parseResult) {
      traverse('astFunctionCallNode', parseResult.parsedStatement, (node: ASTFunctionCallProto__Output) => {
        const nameParts = node.function?.names.map(n => n.idString);
        if (nameParts && nameParts.length > 1 && !functions.some(f => arraysAreEqual(f, nameParts))) {
          functions.push(nameParts);
        }
      });
    }
    return functions;
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
