import { DefinitionLink, DefinitionParams, LocationLink, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DbtRepository } from '../DbtRepository';
import { DagNodeFetcher } from '../ModelFetcher';
import { PositionConverter } from '../PositionConverter';
import { AnalyzeResult } from '../ProjectAnalyzer';
import { Location } from '../ZetaSqlAst';
import { DbtTextDocument, QueryParseInformation } from '../document/DbtTextDocument';
import { getTableRefUniqueId } from '../utils/ManifestUtils';
import { positionInRange, rangesOverlap } from '../utils/Utils';
import { rangesEqual } from '../utils/ZetaSqlUtils';
import { DbtDefinitionProvider } from './DbtDefinitionProvider';

export class SqlDefinitionProvider {
  constructor(private dbtRepository: DbtRepository) {}

  async provideDefinitions(
    definitionParams: DefinitionParams,
    queryInformation: QueryParseInformation | undefined,
    analyzeResult: AnalyzeResult | undefined,
    rawDocument: TextDocument,
    compiledDocument: TextDocument,
  ): Promise<DefinitionLink[] | undefined> {
    if (!queryInformation || !analyzeResult?.ast.isOk()) {
      return undefined;
    }
    for (const select of queryInformation.selects) {
      const column = select.columns.find(c => positionInRange(definitionParams.position, c.rawRange));
      if (column) {
        const completionInfo = DbtTextDocument.ZETA_SQL_AST.getCompletionInfo(
          analyzeResult.ast.value,
          compiledDocument.offsetAt(column.compiledRange.start),
        );
        if (completionInfo.activeTables.length > 0) {
          const { fsPath } = URI.parse(rawDocument.uri);
          const modelFetcher = new DagNodeFetcher(this.dbtRepository, fsPath);
          const node = await modelFetcher.getDagNode();
          const model = node?.getValue();

          if (model) {
            for (const table of completionInfo.activeTables) {
              if (
                table.columns.some(c => {
                  const columnName = column.namePath.at(-1);
                  const tableName = column.namePath.at(-2);
                  return c.name === columnName && (!tableName || tableName === table.alias || tableName === table.name);
                })
              ) {
                const refId = getTableRefUniqueId(model, table.name, this.dbtRepository);
                if (refId) {
                  const refModel = this.dbtRepository.dag.nodes.find(n => n.getValue().uniqueId === refId)?.getValue();
                  if (refModel) {
                    return [
                      LocationLink.create(
                        URI.file(this.dbtRepository.getNodeFullPath(refModel)).toString(),
                        DbtDefinitionProvider.MAX_RANGE,
                        DbtDefinitionProvider.MAX_RANGE,
                        column.rawRange,
                      ),
                    ];
                  }
                }
                if (table.tableNameRange) {
                  const positionConverter = new PositionConverter(rawDocument.getText(), compiledDocument.getText());
                  const start = positionConverter.convertPositionBackward(compiledDocument.positionAt(table.tableNameRange.start));
                  const end = positionConverter.convertPositionBackward(compiledDocument.positionAt(table.tableNameRange.end));
                  const targetRange = Range.create(start, end);

                  return [LocationLink.create(rawDocument.uri, targetRange, targetRange, column.rawRange)];
                }
              }
            }
          }
        }
        for (const [, withSubqueryInfo] of completionInfo.withSubqueries) {
          let range = undefined;
          if (withSubqueryInfo.parseLocationRange) {
            range = SqlDefinitionProvider.toCompiledRange(withSubqueryInfo.parseLocationRange, compiledDocument);
          }

          if (!range || rangesOverlap(range, column.compiledRange)) {
            const clickedColumn = withSubqueryInfo.columns.find(c => {
              const tableName = column.namePath.at(-2);
              return (
                c.name === column.namePath.at(-1) && (!tableName || tableName === c.fromTable || tableName === select.tableAliases.get(c.fromTable))
              );
            });
            if (clickedColumn) {
              const targetWith = completionInfo.withSubqueries.get(clickedColumn.fromTable);
              const targetSelectLocation = targetWith?.parseLocationRange;
              if (targetWith && targetSelectLocation) {
                const positionConverter = new PositionConverter(rawDocument.getText(), compiledDocument.getText());

                const targetRange = Range.create(
                  positionConverter.convertPositionBackward(compiledDocument.positionAt(targetSelectLocation.start)),
                  positionConverter.convertPositionBackward(compiledDocument.positionAt(targetSelectLocation.end)),
                );

                const targetSelect = queryInformation.selects.find(s => rangesEqual(targetSelectLocation, s.parseLocationRange));

                let targetColumnRawRange = targetRange;
                if (targetSelect) {
                  const targetColumn = targetSelect.columns.find(c => c.alias === clickedColumn.name || c.namePath.at(-1) === clickedColumn.name);
                  if (targetColumn) {
                    targetColumnRawRange = Range.create(
                      positionConverter.convertPositionBackward(targetColumn.compiledRange.start),
                      positionConverter.convertPositionBackward(targetColumn.compiledRange.end),
                    );
                  }
                }

                return [LocationLink.create(rawDocument.uri, targetRange, targetColumnRawRange, column.rawRange)];
              }
            }
            break;
          }
        }
      }
    }

    return undefined;
  }

  static toCompiledRange(location: Location, compiledDocument: TextDocument): Range {
    const start = compiledDocument.positionAt(location.start);
    const end = compiledDocument.positionAt(location.end);
    return Range.create(start, end);
  }
}
