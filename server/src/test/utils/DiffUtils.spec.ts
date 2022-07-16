import * as fs from 'fs';
import { assertThat } from 'hamjest';
import { DiffUtils } from '../../utils/DiffUtils';

describe('DiffUtils', () => {
  type content = { raw: string; compiled: string };
  const FILES = new Map<string, content>();

  it('config_at_the_beginning', () => {
    shouldReturnCorrespondingLineNumber('config_at_the_beginning', [
      [2, 9],
      [3, 10],
      [13, 20],
      [16, 23],
    ]);
  });

  it('4_lines_with_config', () => {
    shouldReturnCorrespondingLineNumber('4_lines_with_config', [
      [2, 2],
      [3, 3],
    ]);
  });

  it('inner_join', () => {
    shouldReturnCorrespondingLineNumber('inner_join', [
      [2, 7],
      [3, 8],
    ]);
  });

  it('jinja_at_the_end', () => {
    shouldReturnCorrespondingLineNumber('jinja_at_the_end', [
      [0, 0],
      [4, 4],
      [7, 7],
      [8, 8],
    ]);
  });

  it('one_ref', () => {
    shouldReturnCorrespondingLineNumber('one_ref', [
      [3, 8],
      [9, 14],
      [10, 15],
      [11, 16],
    ]);
  });

  it('multiple_ref', () => {
    const params: number[][] = [];
    for (let i = 20; i <= 25; i++) {
      params.push([i, i + 5]);
    }
    params.push([29, 35]);
    shouldReturnCorrespondingLineNumber('multiple_ref', params);
  });

  it('if', () => {
    shouldReturnCorrespondingLineNumber('if', [
      [3, 11],
      [33, 41],
      [37, 45],
    ]);
  });

  it('one_row', () => {
    shouldReturnCorrespondingLineNumber('one_row', [[0, 0]]);
  });

  it('package_ref', () => {
    shouldReturnCorrespondingLineNumber('package_ref', [
      [1, 1],
      [8, 4],
      [9, 5],
    ]);
  });

  // it('loop', () => {
  //   const fileName = 'loop';
  //   getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 4, 12);
  //   getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 7, 16);
  //   getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 8, 17);
  //   getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 9, 19);
  //   // getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 11, 20);
  //   // getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 13, 22);
  //   getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 26, 23);
  //   getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 27, 24);
  // });

  it('Should return char for not compiled line', () => {
    const params: number[][] = [];
    for (let i = 0; i <= 4; i++) {
      params.push([i, i]);
    }
    for (let i = 35; i <= 37; i++) {
      params.push([i, i + 24]);
    }

    shouldReturnCorrespondingCharacterFor(
      'from `project-abcde-400`.`transforms`.`table_volume_filled` t',
      `from {{ref('table_volume_filled')}} t`,
      params,
    );
  });

  it('Should return char for not compiled line when jinja located at the beginning', () => {
    shouldReturnCorrespondingCharacterFor(' `project-abcde-400`.`transforms`.`table_volume_filled` t', ` {{ref('table_volume_filled')}} t`, [[0, 0]]);
  });

  function shouldReturnCorrespondingCharacterFor(oldLine: string, newLine: string, params: number[][]): void {
    for (const param of params) {
      const [newCharacter, expectedOldCharacter] = param;
      shouldReturnCorrespondingCharacterForOldText(oldLine, newLine, newCharacter, expectedOldCharacter);
    }
  }

  function shouldReturnCorrespondingCharacterForOldText(oldLine: string, newLine: string, newCharacter: number, expectedOldCharacter: number): void {
    // act
    const actualOldCharacter = DiffUtils.getOldCharacter(oldLine, newLine, newCharacter);

    // assert
    assertThat(actualOldCharacter, expectedOldCharacter);
  }

  function shouldReturnCorrespondingLineNumber(fileName: string, compiledRawArray: number[][]): void {
    for (const compiledRaw of compiledRawArray) {
      shouldReturnCorrespondingLineNumberForOldText(fileName, compiledRaw[0], compiledRaw[1]);
      shouldReturnCorrespondingLineNumberForNewText(fileName, compiledRaw[1], compiledRaw[0]);
    }
  }

  function shouldReturnCorrespondingLineNumberForOldText(fileName: string, lineNumberInCompiled: number, lineNumberInRaw: number): void {
    // arrange
    const fileContent = getFilesContent(fileName);

    // act
    const number = DiffUtils.getOldLineNumber(fileContent.raw, fileContent.compiled, lineNumberInCompiled);

    // assert
    assertThat(number, lineNumberInRaw);
  }

  function shouldReturnCorrespondingLineNumberForNewText(fileName: string, lineNumberInRaw: number, lineNumberInCompiled: number): void {
    // arrange
    const fileContent = getFilesContent(fileName);

    // act
    const number = DiffUtils.getNewLineNumber(fileContent.raw, fileContent.compiled, lineNumberInRaw);

    // assert
    assertThat(number, lineNumberInCompiled);
  }

  function getFilesContent(fileName: string): content {
    let fileContent = FILES.get(fileName);
    if (!fileContent) {
      const filesRootPath = './server/src/test/diff/';
      const raw = fs.readFileSync(`${filesRootPath}raw/${fileName}.sql`, 'utf8');
      const compiled = fs.readFileSync(`${filesRootPath}compiled/${fileName}.sql`, 'utf8');
      fileContent = { raw, compiled };
      FILES.set(fileName, fileContent);
    }
    return fileContent;
  }
});
