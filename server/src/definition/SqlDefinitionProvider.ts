import { DefinitionLink, DefinitionParams, LocationLink, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DbtRepository } from '../DbtRepository';
import { DagNodeFetcher } from '../ModelFetcher';
import { PositionConverter } from '../PositionConverter';
import {
  ProjectAnalyzeResults,
  QueryParseInformation,
  QueryParseInformationSelect,
  QueryParseInformationSelectColumn,
} from '../ProjectAnalyzeResults';
import { Location } from '../ZetaSqlAst';
import { DbtTextDocument } from '../document/DbtTextDocument';
import { ManifestModel } from '../manifest/ManifestJson';
import { getTableRefUniqueId } from '../utils/ManifestUtils';
import { positionInRange, rangesOverlap } from '../utils/Utils';
import { rangesEqual } from '../utils/ZetaSqlUtils';
import { DbtDefinitionProvider } from './DbtDefinitionProvider';

export class SqlDefinitionProvider {
  constructor(
    private dbtRepository: DbtRepository,
    private projectAnalyzeResults: ProjectAnalyzeResults,
  ) {}

  async provideDefinitions(
    definitionParams: DefinitionParams,
    rawDocument: TextDocument,
    compiledDocument: TextDocument,
  ): Promise<DefinitionLink[] | undefined> {
    const queryInformation = this.projectAnalyzeResults.getQueryParseInformationByUri(rawDocument.uri);
    const analyzeResult = this.projectAnalyzeResults.getAnalyzeResultByUri(rawDocument.uri);
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
                    const columnPosition = this.getRefModelColumnPosition(refModel, column);
                    if (columnPosition) {
                      return [columnPosition];
                    }

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
                const targetRange = this.projectAnalyzeResults.getRangesByUri(rawDocument.uri, targetSelectLocation)?.rawRange;
                if (targetRange) {
                  const targetSelect = queryInformation.selects.find(s => rangesEqual(targetSelectLocation, s.parseLocationRange));

                  const targetColumnRawRange = this.getTargetColumnOrAlias(targetSelect, clickedColumn.name) ?? targetRange;
                  return [LocationLink.create(rawDocument.uri, targetRange, targetColumnRawRange, column.rawRange)];
                }
              }
              return undefined;
            }

            break;
          }
        }
      }
    }

    return undefined;
  }

  getTargetColumnOrAlias(select: QueryParseInformationSelect | undefined, clickedColumnName: string): Range | undefined {
    if (!select) {
      return undefined;
    }

    const targetAlias = select.columns.find(c => c.alias?.id === clickedColumnName)?.alias;
    if (targetAlias) {
      return Range.create(targetAlias.rawRange.start, targetAlias.rawRange.end);
    }

    const targetColumn = select.columns.find(c => c.canBeTarget && c.namePath.at(-1) === clickedColumnName);
    if (targetColumn) {
      return Range.create(targetColumn.rawRange.start, targetColumn.rawRange.end);
    }

    return undefined;
  }

  getRefModelColumnPosition(refModel: ManifestModel, column: QueryParseInformationSelectColumn): LocationLink | undefined {
    const queryInformation = this.projectAnalyzeResults.getQueryParseInformation(refModel.uniqueId);
    const mainSelect = this.findMainSelect(queryInformation);
    if (mainSelect) {
      const name = column.namePath.at(-1);
      const targetRange = this.projectAnalyzeResults.getRanges(refModel.uniqueId, mainSelect.parseLocationRange)?.rawRange;
      if (name && targetRange) {
        const targetColumnRawRange = this.getTargetColumnOrAlias(mainSelect, name) ?? targetRange;
        const uri = URI.file(this.dbtRepository.getNodeFullPath(refModel)).toString();
        return LocationLink.create(uri, targetRange, targetColumnRawRange, column.rawRange);
      }
    }
    return undefined;
  }

  // Assume that the last non-nested select will be the main select
  findMainSelect(queryInformation: QueryParseInformation | undefined): QueryParseInformationSelect | undefined {
    const selects = queryInformation?.selects ?? [];

    for (let i = selects.length - 1; i >= 0; i--) {
      const select = selects.at(i);
      if (select && !select.isNested) {
        return select;
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
