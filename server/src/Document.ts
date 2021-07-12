import { Position, Range, TextDocuments } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export class Documents {
  textDocuments: TextDocuments<TextDocument>;
  nonWordPattern = /\W/;

  constructor(textDocuments: TextDocuments<TextDocument>) {
    this.textDocuments = textDocuments;
  }

  getLines(uri: string) {
    return this.textDocuments.get(uri)?.getText().split('\n');
  }

  getIdentifierRangeAtPosition(uri: string, position: Position): Range {
    const lines = this.getLines(uri);
    if (!lines) {
      return Range.create(position, position);
    }
    const line = Math.min(lines.length - 1, Math.max(0, position.line));
    const lineText = lines[line];
    const charIndex = Math.min(lineText.length - 1, Math.max(0, position.character));
    const textBeforeChar = lineText.substring(0, charIndex);
    if ((textBeforeChar.split('`').length - 1) % 2 !== 0) {
      return Range.create(line, textBeforeChar.lastIndexOf('`'), line, lineText.indexOf('`', charIndex) + 1);
    }
    if (lineText[charIndex] == '`') {
      return Range.create(line, charIndex, line, lineText.indexOf('`', charIndex + 1) + 1);
    }
    let startChar = charIndex;
    while (startChar > 0 && !this.nonWordPattern.test(lineText.charAt(startChar - 1))) {
      --startChar;
    }
    let endChar = charIndex;
    while (endChar < lineText.length && !this.nonWordPattern.test(lineText.charAt(endChar))) {
      ++endChar;
    }

    return startChar === endChar ? Range.create(position, position) : Range.create(line, startChar, line, endChar);
  }

  getText(uri: string, range: Range) {
    return this.textDocuments.get(uri)?.getText(range);
  }
}
