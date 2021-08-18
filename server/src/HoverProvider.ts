import { TypeKind, SimpleType } from '@fivetrandevelopers/zetasql';
import { AnalyzeResponse } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Hover } from 'vscode-languageserver';

export class HoverProvider {
  static async hoverOnText(text: string, ast: AnalyzeResponse | undefined): Promise<Hover | null> {
    const outputColumn = ast?.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList?.find(c => c.name === text);
    let hint;
    if (outputColumn) {
      if (outputColumn?.column?.tableName === '$query' || outputColumn?.column?.name !== outputColumn?.name) {
        hint = `Alias: ${outputColumn?.name}`;
      } else if (outputColumn?.name) {
        hint = this.getColumnHint(outputColumn?.column?.tableName, outputColumn?.name, <TypeKind>outputColumn?.column?.type?.typeKind);
      }
    }
    if (!hint) {
      const column =
        ast?.resolvedStatement?.resolvedQueryStmtNode?.query?.resolvedProjectScanNode?.inputScan?.resolvedFilterScanNode?.inputScan?.resolvedTableScanNode?.parent?.columnList?.find(
          c => c.name === text,
        );
      if (column) {
        hint = this.getColumnHint(column?.tableName, column?.name, <TypeKind>column?.type?.typeKind);
      }
    }
    return {
      contents: {
        kind: 'plaintext',
        value: hint ?? '',
      },
    };
  }

  static getColumnHint(tableName?: string, columnName?: string, columnTypeKind?: TypeKind) {
    const type = new SimpleType(<TypeKind>columnTypeKind).getTypeName();
    return `Table: ${tableName}\nColumn: ${columnName}\nType: ${type}`;
  }
}
