import { AdapterInfo, DbtVersionInfo, Version } from 'dbt-language-server-common';
import { assertThat } from 'hamjest';
import { ok } from 'node:assert';
import { instance, mock, when } from 'ts-mockito';
import { DbtCommandExecutor } from '../dbt_execution/DbtCommandExecutor';
import { FeatureFinder } from '../feature_finder/FeatureFinder';

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
  const VERSION_COMMAND_RESULT = Promise.resolve({
    stderr: VERSION_OUTPUT,
    stdout: '',
  });

  const LEGACY_VERSION_COMMAND_RESULT = Promise.resolve({
    stderr: LEGACY_VERSION_OUTPUT,
    stdout: '',
  });

  let mockCommandExecutor: DbtCommandExecutor;
  before(() => {
    mockCommandExecutor = mock(DbtCommandExecutor);
  });

  it('getAvailableDbt should return all information about installed dbt and adapters', async () => {
    // arrange
    when(mockCommandExecutor.version()).thenReturn(VERSION_COMMAND_RESULT);

    // act
    const result = await createFeatureFinder(mockCommandExecutor).getAvailableDbt();

    // assert
    assertVersion(result, { major: 1, minor: 1, patch: 1 }, { major: 1, minor: 1, patch: 1 }, [
      { name: 'databricks', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'bigquery', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'spark', version: { major: 1, minor: 1, patch: 0 } },
    ]);
  });

  it('getAvailableDbt should return all information about installed dbt and adapters for legacy dbt version', async () => {
    // arrange
    when(mockCommandExecutor.version()).thenReturn(LEGACY_VERSION_COMMAND_RESULT);

    // act
    const result = await createFeatureFinder(mockCommandExecutor).getAvailableDbt();

    // assert
    assertVersion(result, { major: 0, minor: 20, patch: 1 }, { major: 1, minor: 0, patch: 0 }, [
      { name: 'bigquery', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'snowflake', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'redshift', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'postgres', version: { major: 0, minor: 20, patch: 1 } },
    ]);
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
