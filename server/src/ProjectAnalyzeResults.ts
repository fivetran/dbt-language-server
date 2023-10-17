import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { DbtRepository } from './DbtRepository';
import { PositionConverter } from './PositionConverter';
import { ModelsAnalyzeResult } from './ProjectAnalyzer';
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
  alias?: string;
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
  results?: ModelsAnalyzeResult[];
  queryParseInformations: Map<string, QueryParseInformation> = new Map();

  constructor(private dbtRepository: DbtRepository) {}

  update(results?: ModelsAnalyzeResult[]): void {
    this.results = results;
  }

  updateModel(result: ModelsAnalyzeResult): void {
    this.queryParseInformations.delete(result.modelUniqueId);
    const existing = this.results?.find(r => r.modelUniqueId === result.modelUniqueId);
    if (existing) {
      existing.analyzeResult = result.analyzeResult;
    } else if (this.results) {
      this.results.push(result);
    } else {
      this.results = [result];
    }
  }

  getQueryParseInformation(modelUniqueId: string): QueryParseInformation | undefined {
    let parseInformation = this.queryParseInformations.get(modelUniqueId);
    if (!parseInformation) {
      const parseResult = this.results?.find(r => r.modelUniqueId === modelUniqueId)?.analyzeResult.parseResult;
      if (parseResult) {
        const model = this.dbtRepository.dag.getNodeByUniqueId(modelUniqueId)?.getValue();
        if (model?.rawCode) {
          const compiledCode = this.dbtRepository.getModelCompiledCode(model);
          if (compiledCode) {
            parseInformation = ProjectAnalyzeResults.calculateQueryInformation(parseResult, model.rawCode, compiledCode);
            this.queryParseInformations.set(modelUniqueId, parseInformation);
          }
        }
      }
    }
    return parseInformation;
  }

  getQueryParseInformationByUri(uri: string): QueryParseInformation | undefined {
    const modelUniqueId = this.dbtRepository.dag.getNodeByUri(uri)?.getValue().uniqueId;
    return modelUniqueId ? this.getQueryParseInformation(modelUniqueId) : undefined;
  }

  static calculateQueryInformation(parseResult: ParseResult, rawDocumentText: string, compiledDocumentText: string): QueryParseInformation {
    const converter = new PositionConverter(rawDocumentText, compiledDocumentText);
    const compiledDocument = TextDocument.create('', '', 0, compiledDocumentText);

    return {
      selects: parseResult.selects.map<QueryParseInformationSelect>(s => ({
        columns: s.columns.map(c => {
          const ranges = this.convertParseLocation(compiledDocument, converter, c.parseLocationRange);
          return {
            namePath: c.namePath,
            compiledRange: ranges.compiledRange,
            rawRange: ranges.rawRange,
            alias: c.alias,
          };
        }),
        tableAliases: s.tableAliases,
        parseLocationRange: s.parseLocationRange,
        fromClause: s.fromClause ? this.convertParseLocation(compiledDocument, converter, s.fromClause.parseLocationRange) : undefined,
        isNested: s.isNested,
      })),
    };
  }

  getRangesByUri(uri: string, parseLocationRange: Location): Ranges | undefined {
    const model = this.dbtRepository.dag.getNodeByUri(uri)?.getValue();
    return this.getRangesByModel(model, parseLocationRange);
  }

  getRanges(modelUniqueId: string, parseLocationRange: Location): Ranges | undefined {
    const model = this.dbtRepository.dag.getNodeByUniqueId(modelUniqueId)?.getValue();
    return this.getRangesByModel(model, parseLocationRange);
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
