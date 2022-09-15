import { ZetaSQLClient } from '@fivetrandevelopers/zetasql';
import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { FunctionProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/FunctionProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ResolvedCreateFunctionStmtProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedCreateFunctionStmtProto';
import { ZetaSQLBuiltinFunctionOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ZetaSQLBuiltinFunctionOptionsProto';
import { promisify } from 'node:util';
import { traverse } from './utils/ZetaSqlUtils';

export class SqlHeaderAnalyzer {
  async getAllFunctionDeclarations(
    sqlStatement: string,
    options?: LanguageOptionsProto,
    builtinFunctionOptions?: ZetaSQLBuiltinFunctionOptionsProto | null,
  ): Promise<FunctionProto[]> {
    const functions: FunctionProto[] = [];
    const asts = await this.analyze(sqlStatement, options, builtinFunctionOptions);
    for (const ast of asts) {
      traverse('resolvedCreateFunctionStmtNode', ast.resolvedStatement, (node: ResolvedCreateFunctionStmtProto__Output) => {
        functions.push({
          namePath: node.parent?.namePath,
          signature: [
            {
              argument: node.signature?.argument.map(a => ({
                kind: a.kind,
                type: a.type,
                numOccurrences: a.numOccurrences,
              })),
              returnType: node.signature?.returnType,
            },
          ],
        });
      });
    }
    return functions;
  }

  async analyze(
    sql: string,
    options?: LanguageOptionsProto,
    builtinFunctionOptions?: ZetaSQLBuiltinFunctionOptionsProto | null,
  ): Promise<AnalyzeResponse__Output[]> {
    const analyze = promisify(ZetaSQLClient.API.analyze.bind(ZetaSQLClient.API));
    const asts: AnalyzeResponse__Output[] = [];
    try {
      let bytePosition = 0;
      let result = undefined;
      do {
        result = await analyze({
          parseResumeLocation: {
            input: sql,
            bytePosition,
          },
          simpleCatalog: {
            builtinFunctionOptions,
          },

          options: {
            parseLocationRecordType: ParseLocationRecordType.PARSE_LOCATION_RECORD_CODE_SEARCH,
            errorMessageMode: ErrorMessageMode.ERROR_MESSAGE_ONE_LINE,
            languageOptions: options,
          },
        });

        if (result) {
          asts.push(result);
          bytePosition = result.resumeBytePosition;
        }
      } while (result !== undefined);
    } catch (e) {
      console.log(e);
    }
    return asts;
  }
}
