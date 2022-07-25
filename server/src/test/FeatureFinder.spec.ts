import { ok } from 'assert';
import { assertThat, defined, not } from 'hamjest';
import { deepEqual, instance, mock, when } from 'ts-mockito';
import { AdapterInfo, DbtVersionInfo, Version } from '../DbtVersion';
import { DbtCommand } from '../dbt_execution/commands/DbtCommand';
import { DbtCommandExecutor } from '../dbt_execution/commands/DbtCommandExecutor';
import { DbtRpcCommand } from '../dbt_execution/commands/DbtRpcCommand';
import { FeatureFinder } from '../FeatureFinder';

describe('FeatureFinder', () => {
  const PYTHON_PATH = 'path/to/python';
  const VERSION_OUTPUT = `Core:
                            - installed: 1.1.1
                            - latest:    1.1.1 - Up to date!

                          Plugins:
                            - databricks: 1.1.1 - Up to date!
                            - bigquery:   1.1.1 - Up to date!
                            - spark:      1.1.0 - Up to date!`;

  const LEGACY_VERSION_OUTPU = `installed version: 0.20.1
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
    stderr: LEGACY_VERSION_OUTPU,
    stdout: '',
  });

  const RPC_WITH_PYTHON = new DbtRpcCommand([FeatureFinder.VERSION_PARAM], PYTHON_PATH);
  const DBT_WITH_PYTHON = new DbtCommand([FeatureFinder.VERSION_PARAM], PYTHON_PATH);
  const RPC_GLOBAL = new DbtRpcCommand([FeatureFinder.VERSION_PARAM]);
  const DBT_GLOBAL = new DbtCommand([FeatureFinder.VERSION_PARAM]);

  let mockCommandExecutor: DbtCommandExecutor;
  before(() => {
    mockCommandExecutor = mock(DbtCommandExecutor);
  });

  it('getAvailableDbt should return all information about installed dbt and adapters', async () => {
    // arrange
    when(mockCommandExecutor.execute(deepEqual(RPC_WITH_PYTHON))).thenReturn(VERSION_COMMAND_RESULT);

    // act
    const result = await new FeatureFinder({ path: PYTHON_PATH }, instance(mockCommandExecutor)).getAvailableDbt();

    // assert
    assertVersion(result[0], { major: 1, minor: 1, patch: 1 }, { major: 1, minor: 1, patch: 1 }, [
      { name: 'databricks', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'bigquery', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'spark', version: { major: 1, minor: 1, patch: 0 } },
    ]);
    assertThat(result[1], not(defined()));
    assertThat(result[2], not(defined()));
  });

  it('getAvailableDbt should return all information about installed dbt and adapters for legacy dbt version', async () => {
    // arrange
    when(mockCommandExecutor.execute(deepEqual(RPC_WITH_PYTHON))).thenReturn(LEGACY_VERSION_COMMAND_RESULT);

    // act
    const result = await new FeatureFinder({ path: PYTHON_PATH }, instance(mockCommandExecutor)).getAvailableDbt();

    // assert
    assertVersion(result[0], { major: 0, minor: 20, patch: 1 }, { major: 1, minor: 0, patch: 0 }, [
      { name: 'bigquery', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'snowflake', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'redshift', version: { major: 0, minor: 20, patch: 1 } },
      { name: 'postgres', version: { major: 0, minor: 20, patch: 1 } },
    ]);
    assertThat(result[1], not(defined()));
    assertThat(result[2], not(defined()));
  });

  it('getAvailableDbt should return all information about all available commands', async () => {
    // arrange
    when(mockCommandExecutor.execute(deepEqual(RPC_WITH_PYTHON))).thenReturn(VERSION_COMMAND_RESULT);
    when(mockCommandExecutor.execute(deepEqual(DBT_WITH_PYTHON))).thenReturn(VERSION_COMMAND_RESULT);
    when(mockCommandExecutor.execute(deepEqual(RPC_GLOBAL))).thenReturn(VERSION_COMMAND_RESULT);
    when(mockCommandExecutor.execute(deepEqual(DBT_GLOBAL))).thenReturn(VERSION_COMMAND_RESULT);

    // act
    const result = await new FeatureFinder({ path: PYTHON_PATH }, instance(mockCommandExecutor)).getAvailableDbt();

    // assert
    for (let i = 0; i < 4; i++) {
      assertVersion(result[i], { major: 1, minor: 1, patch: 1 }, { major: 1, minor: 1, patch: 1 }, [
        { name: 'databricks', version: { major: 1, minor: 1, patch: 1 } },
        { name: 'bigquery', version: { major: 1, minor: 1, patch: 1 } },
        { name: 'spark', version: { major: 1, minor: 1, patch: 0 } },
      ]);
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
});
