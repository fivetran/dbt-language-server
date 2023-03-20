import { Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ResolvedTable } from './ZetaSqlAst';
import { Dag } from './dag/Dag';

export interface Change {
  range: Range;
  newText: string;
}

export class SqlRefConverter {
  /** @returns array with ranges in the existing document and new texts for these ranges */
  sqlToRef(textDocument: TextDocument, resolvedTables: ResolvedTable[], dag: Dag): Change[] {
    const changes = [];
    for (const table of resolvedTables) {
      const modelName = dag.nodes.find(n => n.getValue().schema === table.schema && n.getValue().name === table.name)?.getValue().name;
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
