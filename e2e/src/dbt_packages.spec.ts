import { assertThat, containsString } from 'hamjest';
import { workspace } from 'vscode';
import { activateAndWait, getCustomDocUri, getPreviewText, installDbtPackages } from './helper';

suite('Extension should work inside dbt package', () => {
  const PROJECT = 'project-with-packages';

  const FILE_PATH_NEW = `${PROJECT}/dbt_packages/salesforce_source/models/stg_salesforce__user.sql`;
  const FILE_PATH_OLD = `${PROJECT}/dbt_modules/salesforce_source/models/stg_salesforce__user.sql`;

  test('Should compile model inside package', async () => {
    // arrange, act
    installDbtPackages(PROJECT);
    let docUri;
    try {
      docUri = getCustomDocUri(FILE_PATH_NEW);
      await workspace.fs.stat(docUri);
    } catch (e) {
      docUri = getCustomDocUri(FILE_PATH_OLD); // TODO: delete this after getting rid of old dbt version
    }
    await activateAndWait(docUri);

    // assert
    assertThat(getPreviewText(), containsString('`transforms_dbt_default`.`stg_salesforce__user_tmp`'));
  });
});
