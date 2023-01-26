import { assertThat } from 'hamjest';
import * as path from 'node:path';
import { DbtRepository } from '../../DbtRepository';
import { DbtDocumentKind } from '../../document/DbtDocumentKind';
import { DbtDocumentKindResolver } from '../../document/DbtDocumentKindResolver';

describe('DbtDocumentKindResolver', () => {
  const PROJECT_PATH = path.normalize('/Users/user_name/dbt_project');

  let dbtRepository: DbtRepository;
  let dbtDocumentKindResolver: DbtDocumentKindResolver;

  before(() => {
    dbtRepository = new DbtRepository(PROJECT_PATH);
    dbtDocumentKindResolver = new DbtDocumentKindResolver(dbtRepository);
  });

  it('Should determine MACRO for documents located in default location', () => {
    const documentUri = 'file:///Users/user_name/dbt_project/macros/macro.sql';
    shouldReturnCorrectDocumentKind(PROJECT_PATH, documentUri, DbtDocumentKind.MACRO);
  });

  it('Should determine MACRO for documents located in overridden location', () => {
    dbtRepository.macroPaths = ['macros_first', 'macros_second'];

    const firstDocumentUri = 'file:///Users/user_name/dbt_project/macros_first/macro.sql';
    const secondDocumentUri = 'file:///Users/user_name/dbt_project/macros_second/macro.sql';

    shouldReturnCorrectDocumentKind(PROJECT_PATH, firstDocumentUri, DbtDocumentKind.MACRO);
    shouldReturnCorrectDocumentKind(PROJECT_PATH, secondDocumentUri, DbtDocumentKind.MACRO);
  });

  it('Should determine MODEL for documents located in default location', () => {
    const documentUri = 'file:///Users/user_name/dbt_project/models/model.sql';
    shouldReturnCorrectDocumentKind(PROJECT_PATH, documentUri, DbtDocumentKind.MODEL);
  });

  it('Should determine MODEL for documents located in overridden location', () => {
    dbtRepository.modelPaths = ['models_first', 'models_second'];

    const firstDocumentUri = 'file:///Users/user_name/dbt_project/models_first/model.sql';
    const secondDocumentUri = 'file:///Users/user_name/dbt_project/models_second/model.sql';

    shouldReturnCorrectDocumentKind(PROJECT_PATH, firstDocumentUri, DbtDocumentKind.MODEL);
    shouldReturnCorrectDocumentKind(PROJECT_PATH, secondDocumentUri, DbtDocumentKind.MODEL);
  });

  it("Shouldn't determine document kind in root folder", () => {
    const rootDocumentUri = 'file:///Users/user_name/dbt_project/model.sql';
    shouldReturnCorrectDocumentKind(PROJECT_PATH, rootDocumentUri, DbtDocumentKind.UNKNOWN);
  });

  it('Should determine document kind for documents located inside package', () => {
    const packageMacroDocumentUri = 'file:///Users/user_name/dbt_project/dbt_packages/package_name/macros/macro.sql';
    const packageModelDocumentUri = 'file:///Users/user_name/dbt_project/dbt_packages/package_name/models/model.sql';

    const packageResolveResult = path.normalize(`${PROJECT_PATH}/dbt_packages/package_name`);
    dbtDocumentKindResolver.resolveDbtPackagePath = (): string | undefined => packageResolveResult;

    shouldReturnCorrectDocumentKind(PROJECT_PATH, packageMacroDocumentUri, DbtDocumentKind.MACRO);
    shouldReturnCorrectDocumentKind(PROJECT_PATH, packageModelDocumentUri, DbtDocumentKind.MODEL);
  });

  function shouldReturnCorrectDocumentKind(workspaceFolder: string, documentUri: string, expectedDocumentKind: DbtDocumentKind): void {
    const dbtDocumentKind = dbtDocumentKindResolver.getDbtDocumentKind(workspaceFolder, documentUri);
    assertThat(dbtDocumentKind, expectedDocumentKind);
  }
});
