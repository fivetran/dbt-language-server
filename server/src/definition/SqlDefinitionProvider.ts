import { DefinitionLink, DefinitionParams, LocationLink } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DbtRepository } from '../DbtRepository';
import { DbtTextDocument, QueryInformation } from '../document/DbtTextDocument';
import { DagNodeFetcher } from '../ModelFetcher';
import { AnalyzeResult } from '../ProjectAnalyzer';
import { getTableRefUniqueId } from '../utils/ManifestUtils';
import { positionInRange } from '../utils/Utils';
import { DbtDefinitionProvider } from './DbtDefinitionProvider';

export class SqlDefinitionProvider {
  constructor(private dbtRepository: DbtRepository) {}

  async provideDefinitions(
    definitionParams: DefinitionParams,
    queryInformation: QueryInformation | undefined,
    analyzeResult: AnalyzeResult | undefined,
    rawDocument: TextDocument,
    compiledDocument: TextDocument,
  ): Promise<DefinitionLink[] | undefined> {
    if (!queryInformation || !analyzeResult?.ast.isOk()) {
      return undefined;
    }
    const column = queryInformation.columns.find(c => positionInRange(definitionParams.position, c.rawRange));
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
          for (const [tableName, tableInfo] of completionInfo.activeTables) {
            if (tableInfo.columns.some(c => c.name === column.name)) {
              const refId = getTableRefUniqueId(model, tableName, this.dbtRepository);
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
    }
    return undefined;
  }
}
