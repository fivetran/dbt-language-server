import { Position, Range } from 'vscode-languageserver';

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

export function getWordRangeAtPosition(_position: Position, regexp: RegExp, _lines: string[]): Range | undefined {
  const position = validatePosition(_position, _lines);

  if (regExpLeadsToEndlessLoop(regexp)) {
    // use default when custom-regexp is bad
    throw new Error(`[getWordRangeAtPosition]: ignoring custom regexp '${regexp.source}' because it matches the empty string.`);
  }

  const wordAtText = getWordAtText(position.character + 1, ensureValidWordDefinition(regexp), _lines[position.line], 0);

  if (wordAtText) {
    return Range.create(position.line, wordAtText.startColumn - 1, position.line, wordAtText.endColumn - 1);
  }
  return undefined;
}

export function validatePosition(position: Position, _lines: string[]): Position {
  if (_lines.length === 0) {
    return Position.create(0, 0);
  }

  let { line, character } = position;
  let hasChanged = false;

  if (line < 0) {
    line = 0;
    character = 0;
    hasChanged = true;
  } else if (line >= _lines.length) {
    line = _lines.length - 1;
    character = _lines[line].length;
    hasChanged = true;
  } else {
    const maxCharacter = _lines[line].length;
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
  _text: string,
  _textOffset: number,
  config = DEFAULT_CONFIG,
): IWordAtPosition | null {
  let text: string = _text;
  let textOffset: number = _textOffset;

  if (text.length > config.maxLen) {
    // don't throw strings that long at the regexp
    // but use a sub-string in which a word must occur
    let start = column - config.maxLen / 2;
    if (start < 0) {
      start = 0;
    } else {
      textOffset += start;
    }
    text = text.substring(start, column + config.maxLen / 2);
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

  if (match) {
    const result = {
      word: match[0],
      startColumn: textOffset + 1 + match.index!,
      endColumn: textOffset + 1 + match.index! + match[0].length,
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
    } else if (stopPos > 0 && matchIndex > stopPos) {
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
      if ((wordDefinition as any).unicode) {
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
    if (allowInWords.indexOf(sep) >= 0) {
      continue;
    }
    source = `${source}\\${sep}`;
  }
  source += '\\s]+)';
  return new RegExp(source, 'g');
}
