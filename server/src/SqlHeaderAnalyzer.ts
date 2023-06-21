import { ErrorMessageMode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ErrorMessageMode';
import { _zetasql_FunctionEnums_Mode } from '@fivetrandevelopers/zetasql/lib/types/zetasql/FunctionEnums';
import { FunctionProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/FunctionProto';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { ParseLocationRecordType } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ParseLocationRecordType';
import { ResolvedCreateFunctionStmtProto__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ResolvedCreateFunctionStmtProto';
import { SignatureArgumentKind } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SignatureArgumentKind';
import { ZetaSQLBuiltinFunctionOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/ZetaSQLBuiltinFunctionOptionsProto';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ZetaSqlApi } from './ZetaSqlApi';
import { traverse } from './utils/ZetaSqlUtils';

export class SqlHeaderAnalyzer {
  static readonly FUNCTIONS_COUNT_LIMIT = 100;

  constructor(private readonly zetaSqlApi: ZetaSqlApi) {}

  async getAllFunctionDeclarations(
    sqlStatement: string,
    options?: LanguageOptionsProto,
    builtinFunctionOptions?: ZetaSQLBuiltinFunctionOptionsProto | null,
  ): Promise<FunctionProto[]> {
    const functions: FunctionProto[] = [];
    const asts = await this.analyze(sqlStatement, options, builtinFunctionOptions);
    for (const ast of asts) {
      traverse(
        ast.resolvedStatement,
        new Map([
          [
            'resolvedCreateFunctionStmtNode',
            {
              actionBefore: (node: unknown): void => {
                const typedNode = node as ResolvedCreateFunctionStmtProto__Output;

                const func: FunctionProto = {
                  namePath: typedNode.parent?.namePath,
                  signature: [
                    {
                      argument: typedNode.signature?.argument.map(a => ({
                        kind: a.kind,
                        type: a.type,
                        numOccurrences: a.numOccurrences,
                      })),
                      returnType: typedNode.signature?.returnType,
                    },
                  ],
                };

                if (typedNode.signature?.argument.some(a => a.kind === SignatureArgumentKind.ARG_TYPE_ARBITRARY)) {
                  func.group = 'Templated_SQL_Function';
                  func.mode = _zetasql_FunctionEnums_Mode.SCALAR;
                  func.parseResumeLocation = {
                    input: typedNode.code,
                  };
                  func.templatedSqlFunctionArgumentName = typedNode.argumentNameList;
                }

                functions.push(func);
              },
            },
          ],
        ]),
      );
    }
    return functions;
  }

  async analyze(
    sql: string,
    options?: LanguageOptionsProto,
    builtinFunctionOptions?: ZetaSQLBuiltinFunctionOptionsProto | null,
  ): Promise<AnalyzeResponse__Output[]> {
    const asts: AnalyzeResponse__Output[] = [];
    try {
      let bytePosition = 0;
      let result = undefined;
      let count = 0;
      do {
        result = await this.zetaSqlApi.analyze({
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
        count++;
      } while (result !== undefined && count < SqlHeaderAnalyzer.FUNCTIONS_COUNT_LIMIT && bytePosition < sql.length);
    } catch (e) {
      console.log(`SQL header analyze error: ${e instanceof Error ? e.message : String(e)}`);
    }
    return asts;
  }
}
