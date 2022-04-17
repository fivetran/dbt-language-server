import { assertThat } from 'hamjest';
import { ok, Result } from 'neverthrow';
import { DbtRepository } from '../../DbtRepository';
import { DbtDocumentKind } from '../../document/DbtDocumentKind';
import { DbtDocumentKindResolver } from '../../document/DbtDocumentKindResolver';

describe('DbtDocumentKindResolver', () => {
  const PROJECT_LOCATION = '/Users/user_name/dbt_project';

  let dbtRepository: DbtRepository;
  let dbtDocumentKindResolver: DbtDocumentKindResolver;

  before(() => {
    dbtRepository = new DbtRepository();
    dbtDocumentKindResolver = new DbtDocumentKindResolver(dbtRepository);
  });

  it('Should determine MACRO for documents located in default location', () => {
    const documentUri = `file://${PROJECT_LOCATION}/macros/macro.sql`;
    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, documentUri, DbtDocumentKind.MACRO);
  });

  it('Should determine MACRO for documents located in overridden location', () => {
    dbtRepository.macroPaths = ['macros_first', 'macros_second'];

    const firstDocumentUri = `file://${PROJECT_LOCATION}/macros_first/macro.sql`;
    const secondDocumentUri = `file://${PROJECT_LOCATION}/macros_second/macro.sql`;

    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, firstDocumentUri, DbtDocumentKind.MACRO);
    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, secondDocumentUri, DbtDocumentKind.MACRO);
  });

  it('Should determine MODEL for documents located in default location', () => {
    const documentUri = `file://${PROJECT_LOCATION}/models/model.sql`;
    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, documentUri, DbtDocumentKind.MODEL);
  });

  it('Should determine MODEL for documents located in overridden location', () => {
    dbtRepository.modelPaths = ['models_first', 'models_second'];

    const firstDocumentUri = `file://${PROJECT_LOCATION}/models_first/model.sql`;
    const secondDocumentUri = `file://${PROJECT_LOCATION}/models_second/model.sql`;

    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, firstDocumentUri, DbtDocumentKind.MODEL);
    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, secondDocumentUri, DbtDocumentKind.MODEL);
  });

  it(`Shouldn't determine document kind in root folder`, () => {
    const rootDocumentUri = `file://${PROJECT_LOCATION}/model.sql`;
    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, rootDocumentUri, DbtDocumentKind.UNKNOWN);
  });

  it(`Should determine document kind for documents located inside package`, () => {
    const packageMacroDocumentUri = 'dbt_packages/package_name/macros/macro.sql';
    const packageModelDocumentUri = 'dbt_packages/package_name/models/model.sql';

    const packageResolveResult: Result<[string, any], string> = ok([`file://${PROJECT_LOCATION}/dbt_packages/package_name`, {}]);
    dbtDocumentKindResolver.resolveDbtPackageInfo = (): Result<[string, any], string> => packageResolveResult;

    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, `file://${PROJECT_LOCATION}/${packageMacroDocumentUri}`, DbtDocumentKind.MACRO);
    shouldReturnCorrectDocumentKind(PROJECT_LOCATION, `file://${PROJECT_LOCATION}/${packageModelDocumentUri}`, DbtDocumentKind.MODEL);
  });

  function shouldReturnCorrectDocumentKind(workspaceFolder: string, documentUri: string, expectedDocumentKind: DbtDocumentKind): void {
    const dbtDocumentKind = dbtDocumentKindResolver.getDbtDocumentKind(workspaceFolder, documentUri);
    assertThat(dbtDocumentKind, expectedDocumentKind);
  }
});
