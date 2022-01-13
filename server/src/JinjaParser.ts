import { Position, Range, TextDocumentContentChangeEvent } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { comparePositions, rangesOverlap } from './Utils';

export class JinjaParser {
  static readonly JINJA_PATTERN = /{{[\s\S]*?}}|{%[\s\S]*?%}|{#[\s\S]*?#}/g;
  static readonly JINJA_BLOCK_PATTERN = /{%\s*(docs|if|for|macro)\s+.*%}|{%\s*(enddocs|endif|endfor|endmacro)\s*%}/;
  static readonly JINJA_BLOCKS = [
    ['docs', 'enddocs'],
    ['if', 'endif'],
    ['for', 'endfor'],
    ['macro', 'endmacro'],
  ];

  findAllJinjas(rawDocument: TextDocument): Range[] | undefined {
    const text = rawDocument.getText();
    const jinjas = [];
    const blockJinjas = [];
    let m: RegExpExecArray | null;

    while ((m = JinjaParser.JINJA_PATTERN.exec(text))) {
      const jinja = {
        start: rawDocument.positionAt(m.index),
        end: rawDocument.positionAt(m.index + m[0].length),
      };
      jinjas.push(jinja);

      const blockMatch = m[0].match(JinjaParser.JINJA_BLOCK_PATTERN);
      if (blockMatch && blockMatch[1] && JinjaParser.JINJA_BLOCKS.some(b => b[0] === blockMatch[1] || b[1] === blockMatch[1])) {
        blockJinjas.push({
          block: blockMatch[1],
          start: jinja.start,
          end: jinja.end,
        });
      }

      if (blockMatch && blockMatch[2] && JinjaParser.JINJA_BLOCKS.some(b => b[0] === blockMatch[2] || b[1] === blockMatch[2])) {
        blockJinjas.push({
          block: blockMatch[2],
          start: jinja.start,
          end: jinja.end,
        });
      }
    }

    blockJinjas.sort((j1, j2) => comparePositions(j1.start, j2.start));

    const blocksStartPositions = new Map<string, Position[]>();
    JinjaParser.JINJA_BLOCKS.forEach(b => blocksStartPositions.set(b[0], []));

    for (const blockJinja of blockJinjas) {
      if (JinjaParser.JINJA_BLOCKS.some(b => b[0] === blockJinja.block)) {
        blocksStartPositions.get(blockJinja.block)?.push(blockJinja.start);
      } else {
        const [[startBlock]] = JinjaParser.JINJA_BLOCKS.filter(b => b[1] === blockJinja.block);
        const positions = blocksStartPositions.get(startBlock);

        if (!positions || positions.length === 0) {
          return undefined;
        }

        const lastStartPosition = positions[positions.length - 1];
        positions.pop();
        // blocksStartPositions.set(startBlock, );
        jinjas.push({
          start: lastStartPosition,
          end: blockJinja.end,
        });
      }
    }

    return jinjas;
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
