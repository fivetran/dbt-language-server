import { anyOf, assertThat, containsString } from 'hamjest';
import * as fs from 'node:fs';
import { homedir } from 'node:os';
import { Pseudoterminal } from 'vscode';
import { executeCreateDbtProject, getCreateProjectPseudoterminal, sleep } from '../helper';

suite('Create project', () => {
  const KEY_FILE_PATH = `${homedir()}/.dbt/bq-test-project.json`;

  test('Should create new dbt project', async () => {
    await executeCreateDbtProject('/tmp');

    await sleep(12_000);

    const terminal = getCreateProjectPseudoterminal();

    await typeText(terminal, 'test_project');
    await typeText(terminal, '1'); // bigquery adapter
    await typeText(terminal, '2'); // service account
    await typeText(terminal, KEY_FILE_PATH); // keyfile
    await typeText(terminal, 'singular-vector-135519'); // GCP project id
    await typeText(terminal, 'transforms_dbt_default'); // dataset
    await typeText(terminal, '4'); // threads
    await typeText(terminal, ''); // job_execution_timeout_seconds
    await typeText(terminal, '1'); // Desired location option

    const profilesYml = fs.readFileSync(`${homedir()}/.dbt/profiles.yml`, 'utf8');
    assertThat(
      profilesYml,
      anyOf(
        containsString(`
test_project:
  outputs:
    dev:
      dataset: transforms_dbt_default
      fixed_retries: 1
      keyfile: ${KEY_FILE_PATH}
      location: US
      method: service-account
      priority: interactive
      project: singular-vector-135519
      threads: 4
      timeout_seconds: 300
      type: bigquery
  target: dev`),
        containsString(`
test_project:
  outputs:
    dev:
      dataset: transforms_dbt_default
      job_execution_timeout_seconds: 300
      job_retries: 1
      keyfile: ${KEY_FILE_PATH}
      location: US
      method: service-account
      priority: interactive
      project: singular-vector-135519
      threads: 4
      type: bigquery
  target: dev`),
      ),
    );
  });
});

async function typeText(terminal: Pseudoterminal, text: string): Promise<void> {
  const customTerminal = terminal as { handleInput: (text: string) => void };
  customTerminal.handleInput(text);
  customTerminal.handleInput('\r');
  await sleep(1000);
}
