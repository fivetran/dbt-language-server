import { AdapterInfo, DbtVersionInfo, Version } from 'dbt-language-server-common';
import { assertThat, defined, not } from 'hamjest';
import { ok } from 'node:assert';
import { homedir } from 'node:os';
import { deepEqual, instance, mock, when } from 'ts-mockito';
import { DbtCommandFactory } from '../dbt_execution/DbtCommandFactory';
import { DbtCommand } from '../dbt_execution/commands/DbtCommand';
import { DbtCommandExecutor } from '../dbt_execution/commands/DbtCommandExecutor';
import { FeatureFinder } from '../feature_finder/FeatureFinder';
import path = require('node:path');
import slash = require('slash');

describe('FeatureFinder', () => {
  const PYTHON_PATH = 'path/to/python';
  const VERSION_OUTPUT = `Core:
                            - installed: 1.1.1
                            - latest:    1.1.1 - Up to date!

                          Plugins:
                            - databricks: 1.1.1 - Up to date!
                            - bigquery:   1.1.1 - Up to date!
                            - spark:      1.1.0 - Up to date!`;

  const LEGACY_VERSION_OUTPUT = `installed version: 0.20.1
                                  latest version: 1.0.0

                                Your version of dbt is out of date! You can find instructions for upgrading here:
                                https://docs.getdbt.com/docs/installation

                                Plugins:
                                - bigquery: 0.20.1
                                - snowflake: 0.20.1
                                - redshift: 0.20.1
                                - postgres: 0.20.1`;
  const VERSION_COMMAND_RESULT_OLD = Promise.resolve({
    stderr: VERSION_OUTPUT,
    stdout: '',
  });

  const VERSION_COMMAND_RESULT_NEW = Promise.resolve({
    stderr: '',
    stdout: VERSION_OUTPUT,
  });

  const LEGACY_VERSION_COMMAND_RESULT = Promise.resolve({
    stderr: LEGACY_VERSION_OUTPUT,
    stdout: '',
  });

  const PROFILES_DIR = slash(path.join(homedir(), '.dbt'));
  const DBT_WITH_PYTHON_OLD = new DbtCommand(PROFILES_DIR, [DbtCommandFactory.VERSION_PARAM], true, PYTHON_PATH);
  const DBT_WITH_PYTHON_NEW = new DbtCommand(PROFILES_DIR, [DbtCommandFactory.VERSION_PARAM], false, PYTHON_PATH);
  const DBT_GLOBAL = new DbtCommand(PROFILES_DIR, [DbtCommandFactory.VERSION_PARAM], false);

  let mockCommandExecutor: DbtCommandExecutor;
  before(() => {
    mockCommandExecutor = mock(DbtCommandExecutor);
  });

  it('getAvailableDbt should return all information about installed dbt and adapters', async () => {
    // arrange
    when(mockCommandExecutor.execute(deepEqual(DBT_WITH_PYTHON_OLD))).thenReturn(VERSION_COMMAND_RESULT_OLD);

    // act
    const result = await createFeatureFinder(mockCommandExecutor).getAvailableDbt();

    // assert
    assertVersion(result[0], { major: 1, minor: 1, patch: 1 }, { major: 1, minor: 1, patch: 1 }, [
      { name: 'databricks', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'bigquery', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'spark', version: { major: 1, minor: 1, patch: 0 } },
    ]);
    assertThat(result[1], not(defined()));
  });

  it('getAvailableDbt should return all information about installed dbt and adapters for legacy dbt version', async () => {
    // arrange
    when(mockCommandExecutor.execute(deepEqual(DBT_WITH_PYTHON_OLD))).thenReturn(LEGACY_VERSION_COMMAND_RESULT);

    // act
    const result = await createFeatureFinder(mockCommandExecutor).getAvailableDbt();

    // assert
    assertVersion(result[0], { major: 0, minor: 20, patch: 1 }, { major: 1, minor: 0, patch: 0 }, [
      { name: 'bigquery', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'snowflake', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'redshift', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'postgres', version: { major: 0, minor: 20, patch: 1 } },
    ]);
    assertThat(result[1], not(defined()));
  });

  it('getAvailableDbt should return all information about all available commands', async () => {
    // arrange
    when(mockCommandExecutor.execute(deepEqual(DBT_WITH_PYTHON_OLD))).thenReturn(VERSION_COMMAND_RESULT_OLD);
    when(mockCommandExecutor.execute(deepEqual(DBT_WITH_PYTHON_NEW))).thenReturn(VERSION_COMMAND_RESULT_NEW);
    when(mockCommandExecutor.execute(deepEqual(DBT_GLOBAL))).thenReturn(VERSION_COMMAND_RESULT_NEW);

    // act
    const result = await createFeatureFinder(mockCommandExecutor).getAvailableDbt();

    // assert
    for (let i = 0; i < 2; i++) {
      assertVersion(result[i], { major: 1, minor: 1, patch: 1 }, { major: 1, minor: 1, patch: 1 }, [
        { name: 'databricks', version: { major: 1, minor: 1, patch: 1 } },
        { name: 'bigquery', version: { major: 1, minor: 1, patch: 1 } },
        { name: 'spark', version: { major: 1, minor: 1, patch: 0 } },
      ]);
    }
  });

  function createFeatureFinder(mockExecutor: DbtCommandExecutor): FeatureFinder {
    return new FeatureFinder({ path: PYTHON_PATH }, instance(mockExecutor), undefined);
  }
});

function assertVersion(
  versionInfo: DbtVersionInfo | undefined,
  expectedInstalledVersion: Version,
  expectedLatestVersion: Version,
  expectedAdapters: AdapterInfo[],
): void {
  ok(versionInfo);
  assertThat(versionInfo.installedVersion, expectedInstalledVersion);
  assertThat(versionInfo.latestVersion, expectedLatestVersion);
  assertThat(versionInfo.installedAdapters, expectedAdapters);
}
