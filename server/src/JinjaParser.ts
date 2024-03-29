import { Position, Range, TextDocumentContentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { comparePositions, rangesOverlap } from './utils/Utils';

export enum JinjaType {
  UNKNOWN,
  EXPRESSION,
  BLOCK,
  COMMENT,
}

export enum JinjaPartType {
  UNKNOWN,
  EXPRESSION_START,
  EXPRESSION_END,
  BLOCK_START,
  BLOCK_END,
  COMMENT_START,
  COMMENT_END,
}

export interface ParseNode {
  value: string;
  range: Range;
}

export interface Ref {
  modelName: string;
  range: Range;
}

export class JinjaParser {
  static readonly JINJA_EXPRESSION_PATTERN = '{{[\\s\\S]*?}}';
  static readonly JINJA_STATEMENT_PATTERN = '{%[\\s\\S]*?%}';
  static readonly JINJA_COMMENT_PATTERN = '{#[\\s\\S]*?#}';
  static readonly JINJA_PATTERN = new RegExp(
    `${JinjaParser.JINJA_EXPRESSION_PATTERN}|${JinjaParser.JINJA_STATEMENT_PATTERN}|${JinjaParser.JINJA_COMMENT_PATTERN}`,
    'g',
  );
  static readonly EFFECTIVE_JINJA_PATTERN = new RegExp(`${JinjaParser.JINJA_EXPRESSION_PATTERN}|${JinjaParser.JINJA_STATEMENT_PATTERN}`, 'g');

  static readonly JINJA_REF_PATTERN = /{{\s*ref\s*\(\s*(?<start_quote>['|"])(.*?)\k<start_quote>\s*\)\s*}}/g;

  static readonly JINJA_OPEN_BLOCKS = ['docs', 'if', 'for', 'macro', 'call'];
  static readonly JINJA_CLOSE_BLOCKS = ['enddocs', 'endif', 'endfor', 'endmacro', 'endcall'];

  static readonly JINJA_BLOCK_PATTERN = new RegExp(
    `{%\\s*(${JinjaParser.JINJA_OPEN_BLOCKS.join('|')})\\s+.*%}|{%-?\\s*(${JinjaParser.JINJA_CLOSE_BLOCKS.join('|')})\\s*%}`,
  );

  static readonly JINJA_PART_PATTERN = /{\s*{|{\s*%|{\s*#|}\s*}|%\s*}|#\s*}/g;

  getJinjaType(jinja: string): JinjaType {
    if (/^{\s*{/.test(jinja)) {
      return JinjaType.EXPRESSION;
    }
    if (/^{\s*%/.test(jinja)) {
      return JinjaType.BLOCK;
    }
    if (/^{\s*#/.test(jinja)) {
      return JinjaType.COMMENT;
    }
    return JinjaType.UNKNOWN;
  }

  getJinjaPartType(text: string): JinjaPartType {
    if (/{\s*{/.test(text)) {
      return JinjaPartType.EXPRESSION_START;
    }
    if (/{\s*%/.test(text)) {
      return JinjaPartType.BLOCK_START;
    }
    if (/{\s*#/.test(text)) {
      return JinjaPartType.COMMENT_START;
    }

    if (/}\s*}/.test(text)) {
      return JinjaPartType.EXPRESSION_END;
    }
    if (/%\s*}/.test(text)) {
      return JinjaPartType.BLOCK_END;
    }
    if (/#\s*}/.test(text)) {
      return JinjaPartType.COMMENT_END;
    }

    return JinjaPartType.UNKNOWN;
  }
  /**
   * Finds all jinja statements ranges and ranges of jinja blocks: 'docs', 'if', 'for', 'macro'.
   * @param rawDocument editable text document
   * @returns all found ranges or undefined if parsing failed
   */
  findAllJinjaRanges(rawDocument: TextDocument): Range[] | undefined {
    const jinjaExpressions = this.findAllJinjaExpressions(rawDocument);
    const jinjaRanges = jinjaExpressions.map(e => e.range);

    const jinjaBlocks = this.findAllJinjaBlocks(jinjaExpressions);
    if (jinjaBlocks.length === 0) {
      return jinjaRanges;
    }

    const blockRanges = this.findJinjaBlockRanges(jinjaBlocks);
    if (blockRanges) {
      return [...jinjaRanges, ...blockRanges];
    }

    return undefined;
  }

  findAllJinjaBlocks(jinjaExpressions: ParseNode[]): ParseNode[] {
    const jinjaBlocks = [];

    for (const jinjaExpression of jinjaExpressions) {
      const blockMatch = jinjaExpression.value.match(JinjaParser.JINJA_BLOCK_PATTERN);
      const block = this.getJinjaBlock(blockMatch);

      if (block) {
        jinjaBlocks.push({
          value: block,
          range: jinjaExpression.range,
        });
      }
    }

    jinjaBlocks.sort((j1, j2) => comparePositions(j1.range.start, j2.range.start));

    return jinjaBlocks;
  }

  getJinjaBlock(blockMatch: RegExpMatchArray | null): string | undefined {
    if (blockMatch) {
      if (blockMatch.length >= 2 && blockMatch[1] && JinjaParser.JINJA_OPEN_BLOCKS.includes(blockMatch[1])) {
        return blockMatch[1];
      }
      if (blockMatch.length >= 3 && blockMatch[2] && JinjaParser.JINJA_CLOSE_BLOCKS.includes(blockMatch[2])) {
        return blockMatch[2];
      }
    }
    return undefined;
  }

  findJinjaBlockRanges(blockJinjaExpressions: ParseNode[]): Range[] | undefined {
    const jinjaBlockRanges = [];
    const startBlocksPositions = new Map(JinjaParser.JINJA_OPEN_BLOCKS.map<[string, Position[]]>(b => [b, []]));

    for (const blockJinja of blockJinjaExpressions) {
      if (JinjaParser.JINJA_OPEN_BLOCKS.includes(blockJinja.value)) {
        startBlocksPositions.get(blockJinja.value)?.push(blockJinja.range.start);
      } else {
        const startBlock = JinjaParser.JINJA_OPEN_BLOCKS[JinjaParser.JINJA_CLOSE_BLOCKS.indexOf(blockJinja.value)];
        const positions = startBlocksPositions.get(startBlock);

        const lastStartPosition = positions?.pop();
        if (lastStartPosition) {
          jinjaBlockRanges.push({
            start: lastStartPosition,
            end: blockJinja.range.end,
          });
        } else {
          return undefined;
        }
      }
    }

    if ([...startBlocksPositions.values()].some(p => p.length > 0)) {
      return undefined;
    }

    return jinjaBlockRanges;
  }

  findAllRefs(rawDocument: TextDocument): Ref[] {
    return this.findByPattern(rawDocument, JinjaParser.JINJA_REF_PATTERN).map<Ref>(m => ({
      modelName: m[2],
      range: {
        start: rawDocument.positionAt(m.index),
        end: rawDocument.positionAt(m.index + m[0].length),
      },
    }));
  }

  findAllJinjaExpressions(rawDocument: TextDocument): ParseNode[] {
    return this.findJinjas(rawDocument, JinjaParser.JINJA_PATTERN);
  }

  findAllEffectiveJinjas(rawDocument: TextDocument): ParseNode[] {
    return this.findJinjas(rawDocument, JinjaParser.EFFECTIVE_JINJA_PATTERN);
  }

  findAllJinjaParts(rawDocument: TextDocument): ParseNode[] {
    return this.findJinjas(rawDocument, JinjaParser.JINJA_PART_PATTERN);
  }

  findJinjas(rawDocument: TextDocument, pattern: RegExp): ParseNode[] {
    return this.findByPattern(rawDocument, pattern).map<ParseNode>(m => ({
      value: m[0],
      range: {
        start: rawDocument.positionAt(m.index),
        end: rawDocument.positionAt(m.index + m[0].length),
      },
    }));
  }

  private findByPattern(rawDocument: TextDocument, pattern: RegExp): RegExpExecArray[] {
    const text = rawDocument.getText();
    const result = [];
    let m: RegExpExecArray | null;

    while ((m = pattern.exec(text))) {
      result.push(m);
    }
    return result;
  }

  hasJinjas(text: string): boolean {
    return text.includes('{') || text.includes('}') || JinjaParser.JINJA_PATTERN.exec(text) !== null;
  }

  isJinjaModified(jinjas: Range[], changes: TextDocumentContentChangeEvent[]): boolean {
    for (const change of changes) {
      if (!TextDocumentContentChangeEvent.isIncremental(change)) {
        throw new Error('Incremental updates expected');
      }

      for (const jinjaRange of jinjas) {
        if (rangesOverlap(jinjaRange, change.range)) {
          return true;
        }
      }
    }
    return false;
  }
}
