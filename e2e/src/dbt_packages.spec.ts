import { assertThat, containsString } from 'hamjest';
import { activateAndWait, getCustomDocUri, getPreviewText, installDbtPackages } from './helper';

suite('Extension should work inside dbt package', () => {
  const PROJECT = 'project-with-packages';

  test('Should compile model inside package', async () => {
    // arrange, act
    installDbtPackages(PROJECT);
    const docUri = getCustomDocUri(`${PROJECT}/dbt_packages/salesforce_source/models/stg_salesforce__user.sql`);
    await activateAndWait(docUri);

    // assert
    assertThat(getPreviewText(), containsString('`transforms_dbt_default`.`stg_salesforce__user_tmp`'));
  });
});
