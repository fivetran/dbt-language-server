import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ASTFunctionCallProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTFunctionCallProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { promisify } from 'node:util';
import { arraysAreEqual } from './utils/Utils';

interface Node {
  node: 'astFunctionCallNode';
  [key: string]: unknown;
}

export class ZetaSqlParser {
  async getAllFunctions(sqlStatement: string, options?: LanguageOptionsProto): Promise<string[][]> {
    const parse = promisify(ZetaSQLClient.API.parse.bind(ZetaSQLClient.API));
    let parseResult = undefined;
    try {
      parseResult = await parse({
        sqlStatement,
        options,
      });
    } catch (e) {
      console.log(e);
    }

    const functions: string[][] = [];
    if (parseResult) {
      this.traverse<ASTFunctionCallProto>('astFunctionCallNode', parseResult.parsedStatement, (node: ASTFunctionCallProto) => {
        const nameParts = node.function?.names?.map(n => n.idString).filter((n): n is string => n !== undefined);
        if (nameParts && nameParts.length > 1 && !functions.some(f => arraysAreEqual(f, nameParts))) {
          functions.push(nameParts);
        }
      });
    }
    return functions;
  }

  traverse<T>(nodeType: string, unknownNode: unknown, action: (node: T) => void): void {
    const node = unknownNode as Node;
    if (node.node === nodeType) {
      const typedNode = node[node.node] as T;
      action(typedNode);
    }
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (typeof child === 'object' && child !== null) {
        this.traverse(nodeType, child, action);
      }
    }
  }
}
