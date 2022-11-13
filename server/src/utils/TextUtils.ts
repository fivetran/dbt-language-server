import { Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

export interface IWordAtPosition {
  /**
   * The word.
   */
  readonly word: string;
  /**
   * The column where the word starts.
   */
  readonly startColumn: number;
  /**
   * The column where the word ends.
   */
  readonly endColumn: number;
}

export const USUAL_WORD_SEPARATORS = '`~!@#$%^&*()-=+[{]}\\|;:\'",.<>/?';

const DEFAULT_CONFIG = {
  maxLen: 1000,
  windowSize: 15,
  timeBudget: 150,
};

export function getWordRangeAtPosition(position: Position, regexp: RegExp, lines: string[]): Range | undefined {
  const validPosition = validatePosition(position, lines);

  if (regExpLeadsToEndlessLoop(regexp)) {
    throw new Error(`[getWordRangeAtPosition]: ignoring custom regexp '${regexp.source}' because it matches the empty string.`);
  }

  const wordAtText = getWordAtText(validPosition.character + 1, ensureValidWordDefinition(regexp), lines[validPosition.line], 0);

  if (wordAtText) {
    return Range.create(validPosition.line, wordAtText.startColumn - 1, validPosition.line, wordAtText.endColumn - 1);
  }
  return undefined;
}

export function validatePosition(position: Position, lines: string[]): Position {
  if (lines.length === 0) {
    return Position.create(0, 0);
  }

  let { line, character } = position;
  let hasChanged = false;

  if (line < 0) {
    line = 0;
    character = 0;
    hasChanged = true;
  } else if (line >= lines.length) {
    line = lines.length - 1;
    character = lines[line].length;
    hasChanged = true;
  } else {
    const maxCharacter = lines[line].length;
    if (character < 0) {
      character = 0;
      hasChanged = true;
    } else if (character > maxCharacter) {
      character = maxCharacter;
      hasChanged = true;
    }
  }

  if (!hasChanged) {
    return position;
  }
  return Position.create(line, character);
}

export function regExpLeadsToEndlessLoop(regexp: RegExp): boolean {
  // Exit early if it's one of these special cases which are meant to match
  // against an empty string
  if (regexp.source === '^' || regexp.source === '^$' || regexp.source === '$' || regexp.source === '^\\s*$') {
    return false;
  }

  // We check against an empty string. If the regular expression doesn't advance
  // (e.g. ends in an endless loop) it will match an empty string.
  const match = regexp.exec('');
  return Boolean(match && regexp.lastIndex === 0);
}

export function getWordAtText(
  column: number,
  wordDefinition: RegExp,
  inputText: string,
  inputTextOffset: number,
  config = DEFAULT_CONFIG,
): IWordAtPosition | null {
  let text: string = inputText;
  let textOffset: number = inputTextOffset;

  if (text.length > config.maxLen) {
    // don't throw strings that long at the regexp
    // but use a sub-string in which a word must occur
    let start = column - config.maxLen / 2;
    if (start < 0) {
      start = 0;
    } else {
      textOffset += start;
    }
    text = text.slice(start, column + config.maxLen / 2);
    return getWordAtText(column, wordDefinition, text, textOffset, config);
  }

  const t1 = Date.now();
  const pos = column - 1 - textOffset;

  let prevRegexIndex = -1;
  let match: RegExpMatchArray | null = null;

  for (let i = 1; ; i++) {
    // check time budget
    if (Date.now() - t1 >= config.timeBudget) {
      break;
    }

    // reset the index at which the regexp should start matching, also know where it
    // should stop so that subsequent search don't repeat previous searches
    const regexIndex = pos - config.windowSize * i;
    wordDefinition.lastIndex = Math.max(0, regexIndex);
    const thisMatch = findRegexMatchEnclosingPosition(wordDefinition, text, pos, prevRegexIndex);

    if (!thisMatch && match) {
      // stop: we have something
      break;
    }

    match = thisMatch;

    // stop: searched at start
    if (regexIndex <= 0) {
      break;
    }
    prevRegexIndex = regexIndex;
  }

  if (match && match.index !== undefined) {
    const result = {
      word: match[0],
      startColumn: textOffset + 1 + match.index,
      endColumn: textOffset + 1 + match.index + match[0].length,
    };
    wordDefinition.lastIndex = 0;
    return result;
  }

  return null;
}

function findRegexMatchEnclosingPosition(wordDefinition: RegExp, text: string, pos: number, stopPos: number): RegExpMatchArray | null {
  let match: RegExpMatchArray | null;
  while ((match = wordDefinition.exec(text))) {
    const matchIndex = match.index || 0;
    if (matchIndex <= pos && wordDefinition.lastIndex >= pos) {
      return match;
    }
    if (stopPos > 0 && matchIndex > stopPos) {
      return null;
    }
  }
  return null;
}

export function ensureValidWordDefinition(wordDefinition?: RegExp | null): RegExp {
  let result: RegExp = createWordRegExp();

  if (wordDefinition && wordDefinition instanceof RegExp) {
    if (!wordDefinition.global) {
      let flags = 'g';
      if (wordDefinition.ignoreCase) {
        flags += 'i';
      }
      if (wordDefinition.multiline) {
        flags += 'm';
      }
      if (wordDefinition.unicode) {
        flags += 'u';
      }
      result = new RegExp(wordDefinition.source, flags);
    } else {
      result = wordDefinition;
    }
  }

  result.lastIndex = 0;

  return result;
}

function createWordRegExp(allowInWords = ''): RegExp {
  let source = '(-?\\d*\\.\\d\\w*)|([^';
  for (const sep of USUAL_WORD_SEPARATORS) {
    if (!allowInWords.includes(sep)) {
      source = `${source}\\${sep}`;
    }
  }
  source += '\\s]+)';
  return new RegExp(source, 'g');
}

export function getLineByPosition(document: TextDocument, position: Position): string {
  const startPosition = Position.create(position.line, 0);
  const endPosition = Position.create(position.line, Number.MAX_VALUE);
  return document.getText(Range.create(startPosition, endPosition));
}

export interface SignatureInfo {
  range: Range;
  parameterIndex: number;
}

export function getSignatureInfo(lineText: string, cursorPosition: Position): SignatureInfo | undefined {
  const textBeforeCursor = lineText.slice(0, cursorPosition.character);
  let openBracketIndex = -1;
  let closedBracketCount = 0;
  let index = textBeforeCursor.length - 1;
  let parameterIndex = 0;
  let finished = false;
  while (index > 0 && !finished) {
    const char = textBeforeCursor.charAt(index);
    switch (char) {
      case ',': {
        if (closedBracketCount === 0) {
          parameterIndex++;
        }
        break;
      }
      case ')': {
        closedBracketCount++;
        break;
      }
      case '(': {
        if (closedBracketCount === 0) {
          openBracketIndex = index;
          finished = true;
        } else {
          closedBracketCount--;
        }
        break;
      }
      default: {
        // Do nothing
        break;
      }
    }
    index--;
  }
  if (openBracketIndex === -1) {
    return undefined;
  }

  const range = getWordRangeAtPosition(Position.create(0, openBracketIndex), /\w+/, [textBeforeCursor]);
  if (!range) {
    return undefined;
  }
  range.start.line = cursorPosition.line;
  range.end.line = cursorPosition.line;
  return { range, parameterIndex };
}

export function isQuote(text: string): boolean {
  return text === "'" || text === '"';
}
