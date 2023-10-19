import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { URI } from 'vscode-uri';
import { DbtRepository } from './DbtRepository';
import { PositionConverter } from './PositionConverter';
import { AnalyzeResult, ModelsAnalyzeResult } from './ProjectAnalyzer';
import { Location } from './ZetaSqlAst';
import { ParseResult } from './ZetaSqlParser';
import { ManifestModel } from './manifest/ManifestJson';

export interface QueryParseInformation {
  selects: QueryParseInformationSelect[];
}

export interface QueryParseInformationSelectColumn {
  namePath: string[];
  rawRange: Range;
  compiledRange: Range;
  alias?: {
    id: string;
    rawRange: Range;
    compiledRange: Range;
  };
  canBeTarget: boolean;
}

export interface QueryParseInformationSelect {
  columns: QueryParseInformationSelectColumn[];
  tableAliases: Map<string, string>;
  parseLocationRange: Location;
  fromClause?: {
    rawRange: Range;
    compiledRange: Range;
  };
  isNested: boolean;
}

interface Ranges {
  compiledRange: Range;
  rawRange: Range;
}

export class ProjectAnalyzeResults {
  results: Map<string, ModelsAnalyzeResult> = new Map();
  queryParseInformations: Map<string, QueryParseInformation> = new Map();

  constructor(private dbtRepository: DbtRepository) {}

  update(results: ModelsAnalyzeResult[]): void {
    for (const result of results) {
      const refModel = this.dbtRepository.dag.getNodeByUniqueId(result.modelUniqueId)?.getValue();
      if (refModel) {
        const uri = URI.file(this.dbtRepository.getNodeFullPath(refModel)).toString();
        this.updateModel(uri, result);
      }
    }
  }

  updateModel(uri: string, result: ModelsAnalyzeResult): void {
    this.queryParseInformations.delete(uri);
    this.results.set(uri, result);
  }

  getQueryParseInformation(uri: string): QueryParseInformation | undefined {
    let parseInformation = this.queryParseInformations.get(uri);
    if (!parseInformation) {
      const result = this.results.get(uri);
      const parseResult = result?.analyzeResult.parseResult;
      if (parseResult) {
        const model = this.dbtRepository.dag.getNodeByUniqueId(result.modelUniqueId)?.getValue();
        if (model?.rawCode) {
          const compiledCode = this.dbtRepository.getModelCompiledCode(model);
          if (compiledCode) {
            parseInformation = ProjectAnalyzeResults.calculateQueryInformation(parseResult, model.rawCode, compiledCode);
            this.queryParseInformations.set(result.modelUniqueId, parseInformation);
          }
        }
      }
    }
    return parseInformation;
  }

  getAnalyzeResult(uri: string): AnalyzeResult | undefined {
    return this.results.get(uri)?.analyzeResult;
  }

  getRanges(uri: string, parseLocationRange: Location): Ranges | undefined {
    const model = this.dbtRepository.dag.getNodeByUri(uri)?.getValue();
    return this.getRangesByModel(model, parseLocationRange);
  }

  private static calculateQueryInformation(parseResult: ParseResult, rawDocumentText: string, compiledDocumentText: string): QueryParseInformation {
    const converter = new PositionConverter(rawDocumentText, compiledDocumentText);
    const compiledDocument = TextDocument.create('', '', 0, compiledDocumentText);

    return {
      selects: parseResult.selects.map<QueryParseInformationSelect>(s => ({
        columns: s.columns.map(c => {
          const columnRanges = this.convertParseLocation(compiledDocument, converter, c.parseLocationRange);
          const aliasRanges = c.alias ? this.convertParseLocation(compiledDocument, converter, c.alias.parseLocationRange) : undefined;
          return {
            namePath: c.namePath,
            compiledRange: columnRanges.compiledRange,
            rawRange: columnRanges.rawRange,
            alias:
              c.alias && aliasRanges
                ? {
                    id: c.alias.id,
                    compiledRange: aliasRanges.compiledRange,
                    rawRange: aliasRanges.rawRange,
                  }
                : undefined,
            canBeTarget: c.canBeTarget,
          };
        }),
        tableAliases: s.tableAliases,
        parseLocationRange: s.parseLocationRange,
        fromClause: s.fromClause ? this.convertParseLocation(compiledDocument, converter, s.fromClause.parseLocationRange) : undefined,
        isNested: s.isNested,
      })),
    };
  }

  private getRangesByModel(model: ManifestModel | undefined, parseLocationRange: Location): Ranges | undefined {
    if (model?.rawCode) {
      const compiledCode = this.dbtRepository.getModelCompiledCode(model);
      if (compiledCode) {
        const converter = new PositionConverter(model.rawCode, compiledCode);
        const compiledDocument = TextDocument.create('', '', 0, compiledCode);
        return ProjectAnalyzeResults.convertParseLocation(compiledDocument, converter, parseLocationRange);
      }
    }
    return undefined;
  }

  private static convertParseLocation(compiledDocument: TextDocument, converter: PositionConverter, parseLocationRange: Location): Ranges {
    const compiledStart = compiledDocument.positionAt(parseLocationRange.start);
    const compiledEnd = compiledDocument.positionAt(parseLocationRange.end);
    const rawStart = converter.convertPositionBackward(compiledStart);
    const rawEnd = converter.convertPositionBackward(compiledEnd);

    return {
      compiledRange: Range.create(compiledStart, compiledEnd),
      rawRange: Range.create(rawStart, rawEnd),
    };
  }
}
