import { Position, Range, TextDocumentContentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { comparePositions, rangesOverlap } from './Utils';

interface ParseNode {
  expression: string;
  range: Range;
}

export class JinjaParser {
  static readonly JINJA_PATTERN = /{{[\s\S]*?}}|{%[\s\S]*?%}|{#[\s\S]*?#}/g;
  static readonly JINJA_BLOCK_PATTERN = /{%\s*(docs|if|for|macro)\s+.*%}|{%\s*(enddocs|endif|endfor|endmacro)\s*%}/;
  static readonly JINJA_OPEN_BLOCKS = ['docs', 'if', 'for', 'macro'];
  static readonly JINJA_CLOSE_BLOCKS = ['enddocs', 'endif', 'endfor', 'endmacro'];

  findAllJinjaRanges(rawDocument: TextDocument): Range[] | undefined {
    const jinjaExpressions = this.findAllJinjaExpressions(rawDocument);
    const jinjaRanges = jinjaExpressions.map(e => e.range);

    const jinjaBlocks = this.findAllJinjaBlocks(jinjaExpressions);
    if (jinjaBlocks.length === 0) {
      return jinjaRanges;
    }

    const blockRanges = this.findJinjaBlockRanges(jinjaBlocks);
    if (blockRanges) {
      return jinjaRanges.concat(blockRanges);
    }

    return undefined;
  }

  findAllJinjaExpressions(rawDocument: TextDocument): ParseNode[] {
    const text = rawDocument.getText();
    const jinjaExpressions = [];
    let m: RegExpExecArray | null;

    while ((m = JinjaParser.JINJA_PATTERN.exec(text))) {
      jinjaExpressions.push({
        expression: m[0],
        range: Range.create(rawDocument.positionAt(m.index), rawDocument.positionAt(m.index + m[0].length)),
      });
    }

    return jinjaExpressions;
  }

  findAllJinjaBlocks(jinjaExpressions: ParseNode[]): ParseNode[] {
    const jinjaBlocks = [];

    for (const jinjaExpression of jinjaExpressions) {
      const blockMatch = jinjaExpression.expression.match(JinjaParser.JINJA_BLOCK_PATTERN);

      if (blockMatch && blockMatch[1] && JinjaParser.JINJA_OPEN_BLOCKS.includes(blockMatch[1])) {
        jinjaBlocks.push({
          expression: blockMatch[1],
          range: jinjaExpression.range,
        });
      }

      if (blockMatch && blockMatch[2] && JinjaParser.JINJA_CLOSE_BLOCKS.includes(blockMatch[2])) {
        jinjaBlocks.push({
          expression: blockMatch[2],
          range: jinjaExpression.range,
        });
      }
    }

    jinjaBlocks.sort((j1, j2) => comparePositions(j1.range.start, j2.range.start));

    return jinjaBlocks;
  }

  findJinjaBlockRanges(blockJinjaExpressions: ParseNode[]): Range[] | undefined {
    const jinjaBlockRanges = [];

    const startBlocksPositions = new Map<string, Position[]>();
    JinjaParser.JINJA_BLOCKS.forEach(b => startBlocksPositions.set(b[0], []));

    for (const blockJinja of blockJinjaExpressions) {
      if (JinjaParser.JINJA_BLOCKS.some(b => b[0] === blockJinja.expression)) {
        startBlocksPositions.get(blockJinja.expression)?.push(blockJinja.range.start);
      } else {
        const [[startBlock]] = JinjaParser.JINJA_BLOCKS.filter(b => b[1] === blockJinja.expression);
        const positions = startBlocksPositions.get(startBlock);

        const lastStartPosition = positions ? positions.pop() : undefined;
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

    for (const [, positions] of startBlocksPositions.entries()) {
      if (positions.length > 0) {
        return undefined;
      }
    }

    return jinjaBlockRanges;
  }

  hasJinjas(text: string): boolean {
    return text.indexOf('{') > -1 || text.indexOf('}') > -1 || JinjaParser.JINJA_PATTERN.exec(text) !== null;
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
