import { DefinitionLink, DefinitionParams, LocationLink, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DbtRepository } from '../DbtRepository';
import { DbtTextDocument, QueryParseInformation } from '../document/DbtTextDocument';
import { DagNodeFetcher } from '../ModelFetcher';
import { PositionConverter } from '../PositionConverter';
import { AnalyzeResult } from '../ProjectAnalyzer';
import { getTableRefUniqueId } from '../utils/ManifestUtils';
import { positionInRange, rangesOverlap } from '../utils/Utils';
import { Location } from '../ZetaSqlAst';
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
        if (completionInfo.activeTables) {
          const { fsPath } = URI.parse(rawDocument.uri);
          const modelFetcher = new DagNodeFetcher(this.dbtRepository, fsPath);
          const node = await modelFetcher.getDagNode();
          const model = node?.getValue();

          if (model) {
            for (const [activeTableName, tableInfo] of completionInfo.activeTables) {
              if (
                tableInfo.columns.some(c => {
                  const columnName = column.namePath.at(-1);
                  const tableName = column.namePath.at(-2);
                  return c.name === columnName && (!tableName || tableName === tableInfo.alias || tableName === activeTableName);
                })
              ) {
                const refId = getTableRefUniqueId(model, activeTableName, this.dbtRepository);
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
              }
            }
          }
        }
        for (const [, withSubqueryInfo] of completionInfo.withSubqueries) {
          let range = undefined;
          if (withSubqueryInfo.parseLocationRange) {
            range = SqlDefinitionProvider.toRange(withSubqueryInfo.parseLocationRange, compiledDocument);
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

              if (targetWith && targetWith.parseLocationRange) {
                const positionConverter = new PositionConverter(rawDocument.getText(), compiledDocument.getText());

                const start = positionConverter.convertPositionBackward(compiledDocument.positionAt(targetWith.parseLocationRange.start));
                const end = positionConverter.convertPositionBackward(compiledDocument.positionAt(targetWith.parseLocationRange.end));
                const targetRange = Range.create(start, end);
                return [LocationLink.create(rawDocument.uri, targetRange, targetRange, column.rawRange)];
              }
            }
          }
        }
      }
    }

    return undefined;
  }

  static toRange(location: Location, compiledDocument: TextDocument): Range {
    const start = compiledDocument.positionAt(location.start);
    const end = compiledDocument.positionAt(location.end);
    return Range.create(start, end);
  }
}
