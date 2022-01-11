import * as assert from 'assert';
import * as fs from 'fs';
import { Diff } from '../Diff';
import { Range } from 'vscode-languageserver';

describe('Diff', () => {
  it('config_at_the_beginning', () => {
    shouldReturnCorrespondingLineNumber('config_at_the_beginning', [
      [2, 9],
      [3, 10],
      [13, 20],
      [16, 23],
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
    shouldReturnCorrespondingLineNumberForOldText('one_row', 0, 0);
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

  it('Should return removed ranges', () => {
    // arrange
    const fileName = 'if';
    const expectedRanges = [Range.create(0, 0, 8, 2), Range.create(43, 0, 43, 25), Range.create(46, 0, 46, 11)];

    const filesRootPath = __dirname + '/../../src/test/diff/';
    const raw = fs.readFileSync(`${filesRootPath}raw/${fileName}.sql`, 'utf8');
    const compiled = fs.readFileSync(`${filesRootPath}compiled/${fileName}.sql`, 'utf8');

    // act
    const removedRanges = Diff.getRemovedRanges(raw, compiled);

    // assert
    assert.strictEqual(removedRanges.length, expectedRanges.length);
    for (let i = 0; i < expectedRanges.length; i++) {
      assert.strictEqual(Diff.rangesEquals(removedRanges[i], expectedRanges[i]), true);
    }
  });

  function shouldReturnCorrespondingCharacterFor(oldLine: string, newLine: string, params: number[][]): void {
    for (const param of params) {
      const newCharacter = param[0];
      const expectedOldCharacter = param[1];
      shouldReturnCorrespondingCharacterForOldText(oldLine, newLine, newCharacter, expectedOldCharacter);
    }
  }

  function shouldReturnCorrespondingCharacterForOldText(oldLine: string, newLine: string, newCharacter: number, expectedOldCharacter: number): void {
    // act
    const actualOldCharacter = Diff.getOldCharacter(oldLine, newLine, newCharacter);

    // assert
    assert.strictEqual(actualOldCharacter, expectedOldCharacter);
  }

  function shouldReturnCorrespondingLineNumber(fileName: string, params: number[][]): void {
    for (const param of params) {
      shouldReturnCorrespondingLineNumberForOldText(fileName, param[0], param[1]);
    }
  }

  function shouldReturnCorrespondingLineNumberForOldText(fileName: string, newLineNumber: number, expectedOldLineNumber: number): void {
    // arrange
    const filesRootPath = __dirname + '/../../src/test/diff/';
    const raw = fs.readFileSync(`${filesRootPath}raw/${fileName}.sql`, 'utf8');
    const compiled = fs.readFileSync(`${filesRootPath}compiled/${fileName}.sql`, 'utf8');

    // act
    const number = Diff.getOldLineNumber(raw, compiled, newLineNumber);

    // assert
    assert.strictEqual(number, expectedOldLineNumber);
  }
});
