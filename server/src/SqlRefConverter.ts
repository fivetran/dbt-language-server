import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { JinjaParser } from './JinjaParser';
import { getFromClauseString, ManifestNode } from './ManifestJson';
import { ResolvedTable } from './ZetaSqlAst';

export interface Change {
  range: Range;
  newText: string;
}

export class SqlRefConverter {
  static readonly JINJA_PARSER = new JinjaParser();

  /** @returns array with ranges in the existing document and new texts for these ranges */
  refToSql(docWithRef: TextDocument, dbtModels: ManifestNode[]): Change[] {
    const refs = SqlRefConverter.JINJA_PARSER.findAllRefs(docWithRef);
    const changes = [];
    for (const ref of refs) {
      const model = dbtModels.find(m => m.name === ref.modelName);
      if (model) {
        changes.push({
          range: ref.range,
          newText: getFromClauseString(model),
        });
      }
    }
    return changes;
  }

  /** @returns array with ranges in the existing document and new texts for these ranges */
  sqlToRef(textDocument: TextDocument, resolvedTables: ResolvedTable[], dbtModels: ManifestNode[]): Change[] {
    const changes = [];
    for (const table of resolvedTables) {
      const modelName = dbtModels.find(m => m.schema === table.schema && m.name === table.name)?.name;
      if (modelName) {
        const range = Range.create(textDocument.positionAt(table.location.start), textDocument.positionAt(table.location.end));
        changes.push({
          range,
          newText: `{{ ref('${modelName}') }}`,
        });
      }
    }
    return changes;
  }
}
