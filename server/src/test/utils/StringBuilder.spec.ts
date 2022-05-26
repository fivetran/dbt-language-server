import { assertThat, is } from 'hamjest';
import { StringBuilder } from '../../utils/StringBuilder';

describe('StringBuilder', () => {
  const INITIAL_TEXT = 'initial_text';

  let stringBuilder: StringBuilder;

  beforeEach(() => {
    stringBuilder = new StringBuilder();
    stringBuilder.append(INITIAL_TEXT);
  });

  it('append should add text at the end', () => {
    const appendedText = 'appendedText';
    stringBuilder.append(appendedText);
    assertThat(stringBuilder.toString(), is(INITIAL_TEXT.concat(appendedText)));
  });

  it('prepend should add text at the beginning', () => {
    const prependedText = 'prependedText';
    stringBuilder.prepend(prependedText);
    assertThat(stringBuilder.toString(), is(prependedText.concat(INITIAL_TEXT)));
  });

  it('wrap should add text at the end and at the beginning', () => {
    const wrapText = 'wrapText';
    stringBuilder.wrap(wrapText);
    assertThat(stringBuilder.toString(), is(wrapText.concat(INITIAL_TEXT).concat(wrapText)));
  });

  it('appendIf should add text at the end with true condition', () => {
    const appendedText = 'appendedText';
    stringBuilder.appendIf(true, appendedText);
    assertThat(stringBuilder.toString(), is(INITIAL_TEXT.concat(appendedText)));
  });

  it('appendIf should not add text at the end with false condition', () => {
    const appendedText = 'appendedText';
    stringBuilder.appendIf(false, appendedText);
    assertThat(stringBuilder.toString(), is(INITIAL_TEXT));
  });

  it('prependIf should add text at the beginning with true condition', () => {
    const prependedText = 'prependedText';
    stringBuilder.prependIf(true, prependedText);
    assertThat(stringBuilder.toString(), is(prependedText.concat(INITIAL_TEXT)));
  });

  it('prependIf should not add text at the beginning with false condition', () => {
    const prependedText = 'prependedText';
    stringBuilder.prependIf(false, prependedText);
    assertThat(stringBuilder.toString(), is(INITIAL_TEXT));
  });

  it('wrapIf should wrap text with true condition', () => {
    const wrapText = 'wrapText';
    stringBuilder.wrapIf(true, wrapText);
    assertThat(stringBuilder.toString(), is(wrapText.concat(INITIAL_TEXT).concat(wrapText)));
  });

  it('wrapIf should not wrap text with false condition', () => {
    const wrapText = 'wrapText';
    stringBuilder.wrapIf(false, wrapText);
    assertThat(stringBuilder.toString(), is(INITIAL_TEXT));
  });

  it('clear should clear StringBuilder', () => {
    stringBuilder.clear();
    assertThat(stringBuilder.toString(), '');
  });
});
