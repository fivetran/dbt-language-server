import { Diff } from '../Diff';
import * as fs from 'fs';
import assert = require('assert');

describe('Diff', () => {
  it('config_at_the_beginning', () => {
    getOldLineNumber_shouldReturnCorrespondingLineNumber('config_at_the_beginning', [
      [2, 9],
      [3, 10],
      [13, 20],
      [16, 23],
    ]);
  });

  it('jinja_at_the_end', () => {
    getOldLineNumber_shouldReturnCorrespondingLineNumber('jinja_at_the_end', [
      [0, 0],
      [4, 4],
      [7, 7],
      [8, 8],
    ]);
  });

  it('one_ref', () => {
    getOldLineNumber_shouldReturnCorrespondingLineNumber('one_ref', [
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
    getOldLineNumber_shouldReturnCorrespondingLineNumber('multiple_ref', params);
  });

  it('if', () => {
    getOldLineNumber_shouldReturnCorrespondingLineNumber('if', [
      [3, 11],
      [33, 41],
      [37, 45],
    ]);
  });

  it('one_row', () => {
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText('one_row', 0, 0);
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

  function getOldLineNumber_shouldReturnCorrespondingLineNumber(fileName: string, params: number[][]) {
    for (const param of params) {
      getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, param[0], param[1]);
    }
  }

  function getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName: string, newLineNumber: number, expectedOldLineNumber: number) {
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
