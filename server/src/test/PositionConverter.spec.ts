import { spy, verify } from 'ts-mockito';
import { Position } from 'vscode-languageserver';
import { PositionConverter } from '../PositionConverter';
import { DiffUtils } from '../utils/DiffUtils';

describe('PositionConverter', () => {
  let spyDiffUtils: typeof DiffUtils;
  const TEXT = 'a\nb';

  beforeEach(() => {
    spyDiffUtils = spy(DiffUtils);
  });

  it('Multiple call of convertPositionBackward should lead to a call getDiffWords only once', () => {
    // arrange
    const positionConverter = new PositionConverter(TEXT, TEXT);

    // act
    positionConverter.convertPositionBackward(Position.create(0, 0));
    positionConverter.convertPositionBackward(Position.create(0, 1));

    // assert
    verify(spyDiffUtils.getDiffWords(TEXT, TEXT)).once();
  });

  it('Multiple call of convertPositionStraight should lead to a call getDiffWords only once', () => {
    // arrange
    const positionConverter = new PositionConverter(TEXT, TEXT);

    // act
    positionConverter.convertPositionStraight(Position.create(0, 0));
    positionConverter.convertPositionStraight(Position.create(0, 1));

    // assert
    verify(spyDiffUtils.getDiffWords(TEXT, TEXT)).once();
  });

  it('Call of convertPositionStraight and convertPositionBackward should lead to a call getDiffWords only once', () => {
    // arrange
    const positionConverter = new PositionConverter(TEXT, TEXT);

    // act
    positionConverter.convertPositionStraight(Position.create(0, 0));
    positionConverter.convertPositionBackward(Position.create(0, 1));

    // assert
    verify(spyDiffUtils.getDiffWords(TEXT, TEXT)).once();
  });
});
