import { DiffTracker } from '../DiffTracker';
import * as fs from 'fs';

describe('DiffTracker', () => {
  it('config_at_the_beginning', () => {
    const fileName = 'config_at_the_beginning';
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 2, 9);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 3, 10);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 13, 20);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 16, 23);
  });

  it('jinja_at_the_end', () => {
    const fileName = 'jinja_at_the_end';
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 0, 0);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 4, 4);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 7, 7);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 8, 8);
  });

  it('loop', () => {
    const fileName = 'loop';
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 4, 12);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 7, 16);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 8, 17);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 9, 19);
    // getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 11, 20);
    // getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 13, 22);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 26, 23);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 27, 24);
  });

  it('one_ref', () => {
    const fileName = 'one_ref';
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 3, 8);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 9, 14);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 10, 15);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 11, 16);
  });

  it('multiple_ref', () => {
    const fileName = 'multiple_ref';
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 20, 25);
    // for (let i = 20; i <= 25; i++) {
    //   getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, i, i + 5);
    // }

    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 29, 35);
  });

  it('if', () => {
    const fileName = 'if';
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 3, 11);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 33, 41);
    getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName, 37, 45);
  });

  function getOldLineNumber_shouldReturnCorrespondingLineNumberForOldText(fileName: string, newLineNumber: number, expectedOldLineNumber: number) {
    // arrange
    const filesRootPath = './src/__tests__/diff/';
    const raw = fs.readFileSync(`${filesRootPath}raw/${fileName}.sql`, 'utf8');
    const compiled = fs.readFileSync(`${filesRootPath}compiled/${fileName}.sql`, 'utf8');

    // act
    const number = DiffTracker.getOldLineNumber(raw, compiled, newLineNumber);

    // assert
    expect(number).toBe(expectedOldLineNumber);
  }
});
