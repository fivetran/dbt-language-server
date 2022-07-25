import { ok } from 'assert';
import { assertThat, defined, not } from 'hamjest';
import { deepEqual, instance, mock, when } from 'ts-mockito';
import { AdapterInfo, DbtVersionInfo, Version } from '../DbtVersion';
import { DbtCommandExecutor } from '../dbt_execution/commands/DbtCommandExecutor';
import { DbtRpcCommand } from '../dbt_execution/commands/DbtRpcCommand';
import { FeatureFinder } from '../FeatureFinder';

describe('FeatureFinder', () => {
  it('getAvailableDbt should return all information about installed dbt and adapters', async () => {
    const pythonPath = 'path/to/python';
    const mockCommandExecutor = mock(DbtCommandExecutor);
    when(mockCommandExecutor.execute(deepEqual(new DbtRpcCommand([FeatureFinder.VERSION_PARAM], pythonPath)))).thenReturn(
      Promise.resolve({
        stderr: `Core:
        - installed: 1.1.1
        - latest:    1.1.1 - Up to date!
      
      Plugins:
        - databricks: 1.1.1 - Up to date!
        - bigquery:   1.1.1 - Up to date!
        - spark:      1.1.0 - Up to date!`,
        stdout: '',
      }),
    );

    const result = await new FeatureFinder({ path: 'path/to/python' }, instance(mockCommandExecutor)).getAvailableDbt();

    assertVersion(result[0], { major: 1, minor: 1, patch: 1 }, { major: 1, minor: 1, patch: 1 }, [
      { name: 'databricks', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'bigquery', version: { major: 1, minor: 1, patch: 1 } },
      { name: 'spark', version: { major: 1, minor: 1, patch: 0 } },
    ]);
    assertThat(result[1], not(defined()));
    assertThat(result[2], not(defined()));
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
