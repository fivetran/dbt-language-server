import { TypeKind, SimpleType } from '@fivetrandevelopers/zetasql';
import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Hover } from 'vscode-languageserver';
import { ZetaSQLAST } from './ZetaSQLAST';

export class HoverProvider {
  static zetaSQLAST = new ZetaSQLAST();

  static async hoverOnText(text: string, ast: AnalyzeResponse | undefined): Promise<Hover | null> {
    if (!ast) {
      return null;
    }
    const hoverInfo = HoverProvider.zetaSQLAST.getHoverInfo(ast, text);

    let hint;
    if (hoverInfo.outputColumn) {
      const outputColumn = hoverInfo.outputColumn;
      if (outputColumn.column?.tableName === '$query' || outputColumn?.column?.name !== outputColumn?.name) {
        hint = `Alias: ${outputColumn?.name}`;
      } else if (outputColumn?.name) {
        hint = HoverProvider.getColumnHint(outputColumn?.column?.tableName, outputColumn?.name, <TypeKind>outputColumn?.column?.type?.typeKind);
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

  static getColumnHint(tableName?: string, columnName?: string, columnTypeKind?: TypeKind) {
    const type = new SimpleType(<TypeKind>columnTypeKind).getTypeName();
    return `Table: ${tableName}\nColumn: ${columnName}\nType: ${type}`;
  }
}
