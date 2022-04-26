import { assertThat, containsString } from 'hamjest';
import { Position, Range, Uri, workspace } from 'vscode';
import { assertDefinitions } from './asserts';
import { activateAndWait, getCustomDocUri, getPreviewText, installDbtPackages, MAX_RANGE } from './helper';

suite('Extension should work inside dbt package', () => {
  const PROJECT = 'project-with-packages';
  const MODELS_PATH = 'salesforce_source/models/';

  const FILE_PATH_NEW = `${PROJECT}/dbt_packages/`;
  const FILE_PATH_OLD = `${PROJECT}/dbt_modules/`;

  async function findDocUriInPackage(path: string): Promise<Uri> {
    let docUri;
    try {
      docUri = getCustomDocUri(FILE_PATH_NEW + path);
      await workspace.fs.stat(docUri);
    } catch (e) {
      docUri = getCustomDocUri(FILE_PATH_OLD + path); // TODO: delete this after getting rid of old dbt version
    }
    return docUri;
  }

  installDbtPackages(PROJECT);

  test('Should compile model inside package', async () => {
    // arrange
    const docUri = await findDocUriInPackage(`${MODELS_PATH}/stg_salesforce__user.sql`);

    // act
    await activateAndWait(docUri);

    // assert
    assertThat(getPreviewText(), containsString('`transforms_dbt_default`.`stg_salesforce__user_tmp`'));
  });

  test('Should compile model inside package in intermediate folder', async () => {
    // arrange
    const docUri = await findDocUriInPackage(`salesforce/models/intermediate/salesforce__opportunity_aggregation_by_owner.sql`);

    // act
    await activateAndWait(docUri);

    // assert
    assertThat(getPreviewText(), containsString('`transforms_dbt_default`.`salesforce__opportunity_enhanced`'));
  });

  test('Should suggest definitions for ref', async () => {
    // arrange
    const docUri = await findDocUriInPackage(`${MODELS_PATH}/stg_salesforce__user.sql`);

    // act
    await activateAndWait(docUri);

    // assert
    await assertDefinitions(docUri, new Position(3, 17), [
      {
        originSelectionRange: new Range(3, 17, 3, 41),
        targetUri: await findDocUriInPackage(`${MODELS_PATH}/tmp/stg_salesforce__user_tmp.sql`),
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });

  test('Should suggest definitions for macros', async () => {
    // arrange
    const docUri = await findDocUriInPackage('fivetran_utils/macros/generate_columns_macro.sql');

    // act
    await activateAndWait(docUri);

    // assert
    await assertDefinitions(docUri, new Position(2, 17), [
      {
        originSelectionRange: new Range(2, 17, 2, 38),
        targetUri: await findDocUriInPackage('fivetran_utils/macros/get_columns_for_macro.sql'),
        targetRange: new Range(70, 0, 72, 15),
        targetSelectionRange: new Range(70, 9, 70, 30),
      },
    ]);
  });
});
