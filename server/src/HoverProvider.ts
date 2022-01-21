import { SimpleType, TypeKind } from '@fivetrandevelopers/zetasql';
import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Hover } from 'vscode-languageserver';
import { ZetaSqlAst } from './ZetaSqlAst';

export class HoverProvider {
  static zetaSqlAst = new ZetaSqlAst();

  static hoverOnText(text: string, ast: AnalyzeResponse | undefined): Hover | null {
    if (!ast) {
      return null;
    }
    const hoverInfo = HoverProvider.zetaSqlAst.getHoverInfo(ast, text);

    let hint;
    if (hoverInfo.outputColumn) {
      const { outputColumn } = hoverInfo;
      if (outputColumn.column?.tableName === '$query' || outputColumn.column?.name !== outputColumn.name) {
        hint = `Alias: ${outputColumn.name}`;
      } else if (outputColumn.name) {
        hint = HoverProvider.getColumnHint(outputColumn.column?.tableName, outputColumn.name, outputColumn.column?.type?.typeKind as TypeKind);
      }
    } else if (hoverInfo.withQueryName) {
      hint = `Temporary table introduced in a WITH clause: ${hoverInfo.withQueryName}`;
    } else if (hoverInfo.tableName) {
      hint = `Table: ${hoverInfo.tableName}`;
    } else if (hoverInfo.function) {
      hint = `Function: ${text}`;
    }

    return hint
      ? {
          contents: {
            kind: 'plaintext',
            value: hint,
          },
        }
      : null;
  }

  static getColumnHint(tableName?: string, columnName?: string, columnTypeKind?: TypeKind): string {
    const type = columnTypeKind ? new SimpleType(columnTypeKind).getTypeName() : 'unknown';
    return `Table: ${tableName}\nColumn: ${columnName}\nType: ${type}`;
  }
}
