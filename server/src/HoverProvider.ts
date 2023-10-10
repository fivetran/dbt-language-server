import { TypeKind__Output } from '@fivetrandevelopers/zetasql';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { Hover, MarkupKind } from 'vscode-languageserver';
import { HelpProviderWords } from './HelpProviderWords';
import { SupportedDestinations } from './ZetaSqlApi';
import { ZetaSqlAst } from './ZetaSqlAst';
import { TYPE_KIND_NAMES } from './utils/ZetaSqlUtils';

export class HoverProvider {
  static ZETA_SQL_AST = new ZetaSqlAst();

  hoverOnText(text: string, ast: AnalyzeResponse__Output | undefined, destination?: SupportedDestinations): Hover | null {
    if (destination !== 'snowflake') {
      const index = HelpProviderWords.findIndex(w => w.name === text.toLocaleLowerCase());
      if (index !== -1) {
        const [firstSignature] = HelpProviderWords[index].signatures;
        return {
          contents: {
            kind: MarkupKind.Markdown,
            value: [`\`\`\`sql\n${firstSignature.signature}\n\`\`\``, firstSignature.description].join('\n---\n'),
          },
        };
      }
    }

    if (!ast) {
      return null;
    }
    const hoverInfo = HoverProvider.ZETA_SQL_AST.getHoverInfo(ast, text);

    let hint;
    if (hoverInfo.outputColumn) {
      const { outputColumn } = hoverInfo;
      if (outputColumn.column?.tableName === '$query' || outputColumn.column?.name !== outputColumn.name) {
        hint = `Alias: ${String(outputColumn.name)}`;
      } else if (outputColumn.name) {
        hint = this.getColumnHint(outputColumn.column.tableName, outputColumn.name, outputColumn.column.type?.typeKind);
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

  getColumnHint(tableName?: string, columnName?: string, columnTypeKind?: TypeKind__Output): string {
    const type = columnTypeKind ? TYPE_KIND_NAMES.get(columnTypeKind) : 'unknown';
    return `Table: ${String(tableName)}\nColumn: ${String(columnName)}\nType: ${type}`;
  }
}
