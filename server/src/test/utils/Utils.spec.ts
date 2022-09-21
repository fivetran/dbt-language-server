/* eslint-disable sonarjs/no-duplicate-string */
import { assertThat } from 'hamjest';
import * as path from 'node:path';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Position, Range } from 'vscode-languageserver-types';
import {
  areRangesEqual,
  comparePositions,
  debounce,
  extractDatasetFromFullName,
  getFilePathRelatedToWorkspace,
  getIdentifierRangeAtPosition,
  getJinjaContentOffset,
  rangesOverlap,
} from '../../utils/Utils';
import { sleep } from '../helper';

describe('Utils', () => {
  it('comparePositions_shouldComparePositions', () => {
    assertThat(comparePositions(Position.create(0, 0), Position.create(1, 1)), -1);
    assertThat(comparePositions(Position.create(1, 0), Position.create(1, 1)), -1);
    assertThat(comparePositions(Position.create(1, 1), Position.create(1, 1)), 0);
    assertThat(comparePositions(Position.create(1, 1), Position.create(1, 0)), 1);
    assertThat(comparePositions(Position.create(1, 1), Position.create(0, 0)), 1);
  });

  it('rangesOverlap_shouldCheckIfRangesOverlap', () => {
    assertThat(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 0, 0, 1)), true);
    assertThat(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 1, 1, 1)), true);
    assertThat(rangesOverlap(Range.create(1, 1, 3, 3), Range.create(0, 0, 2, 2)), true);
    assertThat(rangesOverlap(Range.create(1, 1, 1, 3), Range.create(0, 0, 3, 3)), true);
    assertThat(rangesOverlap(Range.create(0, 0, 3, 3), Range.create(1, 1, 1, 3)), true);
    assertThat(rangesOverlap(Range.create(1, 1, 5, 3), Range.create(0, 0, 3, 3)), true);
    assertThat(rangesOverlap(Range.create(0, 0, 3, 3), Range.create(1, 1, 5, 3)), true);

    assertThat(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(0, 2, 1, 1)), false);
    assertThat(rangesOverlap(Range.create(0, 0, 0, 1), Range.create(1, 0, 1, 1)), false);
    assertThat(rangesOverlap(Range.create(2, 2, 3, 3), Range.create(1, 1, 2, 1)), false);
    assertThat(rangesOverlap(Range.create(0, 2, 1, 1), Range.create(0, 0, 0, 1)), false);
    assertThat(rangesOverlap(Range.create(1, 0, 1, 1), Range.create(0, 0, 0, 1)), false);
    assertThat(rangesOverlap(Range.create(1, 1, 2, 1), Range.create(2, 2, 3, 3)), false);
  });

  it('areRangesEqual should compare ranges', () => {
    assertThat(areRangesEqual(Range.create(0, 0, 0, 0), Range.create(0, 0, 0, 0)), true);
    assertThat(areRangesEqual(Range.create(1, 0, 0, 0), Range.create(1, 0, 0, 0)), true);
    assertThat(areRangesEqual(Range.create(1, 0, 2, 0), Range.create(1, 0, 2, 0)), true);
    assertThat(areRangesEqual(Range.create(0, 0, 2, 0), Range.create(0, 0, 2, 0)), true);
    assertThat(areRangesEqual(Range.create(0, 0, 0, 2), Range.create(0, 0, 0, 2)), true);
    assertThat(areRangesEqual(Range.create(0, 0, 0, 2), Range.create(0, 2, 0, 0)), true);

    assertThat(areRangesEqual(Range.create(0, 0, 0, 1), Range.create(0, 0, 0, 0)), false);
    assertThat(areRangesEqual(Range.create(0, 0, 0, 2), Range.create(0, 0, 0, 1)), false);
    assertThat(areRangesEqual(Range.create(1, 0, 0, 0), Range.create(0, 0, 0, 0)), false);
    assertThat(areRangesEqual(Range.create(0, 1, 0, 0), Range.create(0, 0, 0, 0)), false);
    assertThat(areRangesEqual(Range.create(0, 0, 1, 0), Range.create(0, 0, 0, 0)), false);
    assertThat(areRangesEqual(Range.create(0, 0, 0, 1), Range.create(0, 0, 0, 0)), false);
  });

  describe('getJinjaContentOffset', () => {
    it('getJinjaContentOffset should return jinja content offset', () => {
      shouldReturnJinjaContentOffset('{{', 0, -1);
      shouldReturnJinjaContentOffset('{{', 1, -1);
      shouldReturnJinjaContentOffset('{}', 1, -1);
      shouldReturnJinjaContentOffset('{ {}}', 3, -1);
      shouldReturnJinjaContentOffset('{$$}', 2, -1);
      shouldReturnJinjaContentOffset('}{}}', 2, -1);
      shouldReturnJinjaContentOffset('}##}', 2, -1);
      shouldReturnJinjaContentOffset('}%%}', 2, -1);

      shouldReturnJinjaContentOffset('{{', 2, 2);
      shouldReturnJinjaContentOffset('{{ref(', 6, 2);
      shouldReturnJinjaContentOffset('{{}}', 2, 2);
      shouldReturnJinjaContentOffset('{##}', 2, 2);
      shouldReturnJinjaContentOffset('{%%}', 2, 2);
    });
  });
  it('extractDatasetFromFullName should extract dataset', () => {
    assertThat(extractDatasetFromFullName('`project`.`dataset`.`table`', 'table'), 'dataset');
    assertThat(extractDatasetFromFullName('`project`.`dataset`.table', 'table'), 'dataset');
    assertThat(extractDatasetFromFullName('`project`.dataset.table', 'table'), 'dataset');
    assertThat(extractDatasetFromFullName('project.`dataset`.table', 'table'), 'dataset');
    assertThat(extractDatasetFromFullName('project.dataset.table', 'table'), 'dataset');
    assertThat(extractDatasetFromFullName('`project.dataset.table`', 'table'), 'dataset');

    assertThat(extractDatasetFromFullName('"region-us.INFORMATION_SCHEMA.TABLES"', 'table'), undefined);
  });

  it('getIdentifierRangeAtPosition should return range', () => {
    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 0), 'First second third', Range.create(0, 0, 0, 5));
    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 5), 'First second third', Range.create(0, 0, 0, 5));
    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 6), 'First second third', Range.create(0, 6, 0, 12));

    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 6), '111 222 333', Range.create(0, 4, 0, 7));

    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 0), 'First.second third', Range.create(0, 0, 0, 5));
    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 6), 'First.second third', Range.create(0, 6, 0, 12));
    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 8), 'First.second third', Range.create(0, 6, 0, 12));

    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 0), 'First1second third', Range.create(0, 0, 0, 12));
    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 0), '`First` second third', Range.create(0, 0, 0, 7));
    getIdentifierRangeAtPositionShouldReturnRange(Position.create(0, 0), '`First`.second third', Range.create(0, 0, 0, 7));
    getIdentifierRangeAtPositionShouldReturnRange(
      Position.create(1, 7),
      `
       First`,
      Range.create(1, 7, 1, 12),
    );
    getIdentifierRangeAtPositionShouldReturnRange(
      Position.create(1, 500),
      `
       First`,
      Range.create(1, 7, 1, 12),
    );
  });

  it("debounce should use different Timeout's for every call", async () => {
    // arrange
    let firstDebounceCounter = 0;
    let secondDebounceCounter = 0;

    const firstDebounce = debounce(() => {
      firstDebounceCounter++;
    }, 20);
    const secondDebounce = debounce(() => {
      secondDebounceCounter++;
    }, 1);

    // act
    firstDebounce();
    secondDebounce();
    await sleep(20);

    // assert
    assertThat(firstDebounceCounter, 1);
    assertThat(secondDebounceCounter, 1);
  });

  it('getFilePathRelatedToWorkspace should return path', () => {
    assertThat(
      getFilePathRelatedToWorkspace(
        'file:///Users/user/Fivetran/dbt-language-server/e2e/projects/test-fixture/models/simple_select_dbt.sql',
        path.normalize('/Users/user/Fivetran/dbt-language-server/e2e/projects/test-fixture'),
      ),
      path.normalize('models/simple_select_dbt.sql'),
    );
  });
});

function shouldReturnJinjaContentOffset(docContent: string, cursorCharPos: number, expected: number): void {
  assertThat(getJinjaContentOffset(TextDocument.create('test', 'sql', 0, docContent), Position.create(0, cursorCharPos)), expected);
}

function getIdentifierRangeAtPositionShouldReturnRange(position: Position, text: string, expectedRange: Range): void {
  assertThat(getIdentifierRangeAtPosition(position, text), expectedRange);
}
