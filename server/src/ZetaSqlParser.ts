import { TypeFactory, TypeKind, ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { AnyASTTypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/AnyASTTypeProto';
import { ASTCreateFunctionStatementProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTCreateFunctionStatementProto';
import { ASTFunctionCallProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ASTFunctionCallProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { StructFieldProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/StructFieldProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { promisify } from 'node:util';
import { Udf } from './bigquery/BigQueryClient';
import { arraysAreEqual } from './utils/Utils';

interface Node {
  node: 'astFunctionCallNode';
  [key: string]: unknown;
}

export class ZetaSqlParser {
  async getAllFunctionCalls(sqlStatement: string, options?: LanguageOptionsProto): Promise<string[][]> {
    const functions: string[][] = [];
    const parseResult = await this.parse(sqlStatement, options);
    if (parseResult) {
      this.traverse('astFunctionCallNode', parseResult.parsedStatement, (node: ASTFunctionCallProto__Output) => {
        const nameParts = node.function?.names.map(n => n.idString);
        if (nameParts && nameParts.length > 1 && !functions.some(f => arraysAreEqual(f, nameParts))) {
          functions.push(nameParts);
        }
      });
    }
    return functions;
  }

  async getAllFunctionDeclarations(sqlStatement: string, options?: LanguageOptionsProto): Promise<Udf[]> {
    const udfs: Udf[] = [];
    const parseResult = await this.parse(sqlStatement, options);
    if (parseResult) {
      this.traverse('astCreateFunctionStatementNode', parseResult.parsedStatement, (node: ASTCreateFunctionStatementProto__Output) => {
        const functionDeclaration = node.parent?.functionDeclaration;
        const nameParts = functionDeclaration?.name?.names.map(n => n.idString);
        const args = functionDeclaration?.parameters?.parameterEntries.map(e => ({
          name: e.name?.idString,
          type: e.type ? ZetaSqlParser.toTypeProto(e.type) : undefined,
        }));
        const returnType = node.returnType ? ZetaSqlParser.toTypeProto(node.returnType) : undefined;
        if (nameParts && args && args.every(a => a.name && a.type?.typeKind) && returnType?.typeKind) {
          udfs.push({
            nameParts,
            arguments: args.filter((a): a is { name: string | undefined; type: TypeProto } => a.type !== undefined),
            returnType,
          });
        }
      });
    }
    return udfs;
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

  static toTypeProto(astType: AnyASTTypeProto): TypeProto | undefined {
    switch (astType.node) {
      case 'astSimpleTypeNode': {
        const simpleType = astType[astType.node];
        const names = simpleType?.typeName?.names;
        if (names?.length && names.length > 0) {
          const type = names[0].idString?.toLowerCase();
          if (type) {
            const typeKind = TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(type);
            if (typeKind) {
              return { typeKind };
            }
          }
        }
        break;
      }

      case 'astArrayTypeNode': {
        const arrayType = astType[astType.node];
        if (arrayType?.elementType) {
          const elementType = this.toTypeProto(arrayType.elementType);
          if (elementType) {
            return {
              typeKind: TypeKind.TYPE_ARRAY,
              arrayType: {
                elementType,
              },
            };
          }
        }
        break;
      }

      case 'astStructTypeNode': {
        const structType = astType[astType.node];
        if (structType?.structFields) {
          const field = structType.structFields.map<StructFieldProto>(f => ({
            fieldName: f.name?.idString,
            fieldType: f.type ? this.toTypeProto(f.type) : undefined,
          }));
          if (field.every(f => f.fieldName && f.fieldType)) {
            return {
              typeKind: TypeKind.TYPE_STRUCT,
              structType: {
                field,
              },
            };
          }
        }
        break;
      }

      default:
        break;
    }
    return undefined;
  }
}
