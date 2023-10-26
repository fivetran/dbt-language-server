import { assertThat, containsString, isEmpty } from 'hamjest';
import { Position, Range, Uri, languages } from 'vscode';
import { assertDefinitions } from './asserts';
import {
  MAX_RANGE,
  activateAndWait,
  activateAndWaitManifestParsed,
  getAbsolutePath,
  getCustomDocUri,
  getPreviewText,
  openDocument,
  runDbtDeps,
  waitDiagnostics,
} from './helper';

suite('Extension should work inside dbt package', () => {
  const PROJECT = 'project-with-packages';
  const MODELS_PATH = 'salesforce_source/models/';

  const FILE_PATH_NEW = `${PROJECT}/dbt_packages/`;

  function findDocUriInPackage(path: string): Uri {
    return getCustomDocUri(FILE_PATH_NEW + path);
  }

  test('Should run dbt deps', async () => {
    // arrange
    const projectUri = getCustomDocUri(`${PROJECT}/dbt_project.yml`);
    await openDocument(projectUri);
    await waitDiagnostics(projectUri, 1);

    // act
    await runDbtDeps();
    await waitDiagnostics(projectUri, 0);

    // assert
    assertThat(languages.getDiagnostics(projectUri), isEmpty());
  });

  test('Should compile model inside package', async () => {
    // arrange
    const docUri = findDocUriInPackage(`${MODELS_PATH}/stg_salesforce__user.sql`);

    // act
    await activateAndWait(docUri);

    // assert
    assertThat(getPreviewText(), containsString('`transforms_dbt_default`.`stg_salesforce__user_tmp`'));
  });

  test('Should compile model inside package in intermediate folder', async () => {
    // arrange
    const docUri = findDocUriInPackage('salesforce/models/intermediate/salesforce__opportunity_aggregation_by_owner.sql');

    // act
    await activateAndWait(docUri);

    // assert
    assertThat(getPreviewText(), containsString('`transforms_dbt_default`.`salesforce__opportunity_enhanced`'));
  });

  test('Should suggest definitions for ref', async () => {
    // arrange
    const docUri = findDocUriInPackage(`${MODELS_PATH}/stg_salesforce__user.sql`);

    // act
    await activateAndWaitManifestParsed(docUri, getAbsolutePath(PROJECT));

    // assert
    await assertDefinitions(docUri, new Position(3, 17), [
      {
        originSelectionRange: new Range(3, 17, 3, 41),
        targetUri: findDocUriInPackage(`${MODELS_PATH}/tmp/stg_salesforce__user_tmp.sql`),
        targetRange: MAX_RANGE,
        targetSelectionRange: MAX_RANGE,
      },
    ]);
  });

  test('Should suggest definitions for macros', async () => {
    // arrange
    const docUri = findDocUriInPackage('fivetran_utils/macros/generate_columns_macro.sql');

    // act
    await activateAndWaitManifestParsed(docUri, getAbsolutePath(PROJECT));

    // assert
    await assertDefinitions(docUri, new Position(2, 17), [
      {
        originSelectionRange: new Range(2, 17, 2, 38),
        targetUri: findDocUriInPackage('fivetran_utils/macros/get_columns_for_macro.sql'),
        targetRange: new Range(70, 0, 72, 15),
        targetSelectionRange: new Range(70, 9, 70, 9),
      },
    ]);
  });
});
