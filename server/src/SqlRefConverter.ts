import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ManifestModel } from './manifest/ManifestJson';
import { ResolvedTable } from './ZetaSqlAst';

export interface Change {
  range: Range;
  newText: string;
}

export class SqlRefConverter {
  /** @returns array with ranges in the existing document and new texts for these ranges */
  sqlToRef(textDocument: TextDocument, resolvedTables: ResolvedTable[], dbtModels: ManifestModel[]): Change[] {
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
