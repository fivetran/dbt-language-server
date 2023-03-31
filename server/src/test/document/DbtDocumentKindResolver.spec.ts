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
    dbtRepository = new DbtRepository(PROJECT_PATH, Promise.resolve(undefined));
    dbtDocumentKindResolver = new DbtDocumentKindResolver(dbtRepository);
  });

  it('Should determine MACRO for documents located in default location', () => {
    const documentUri = 'file:///Users/user_name/dbt_project/macros/macro.sql';
    shouldReturnCorrectDocumentKind(documentUri, DbtDocumentKind.MACRO);
  });

  it('Should determine MACRO for documents located in overridden location', () => {
    dbtRepository.macroPaths = ['macros_first', 'macros_second'];

    const firstDocumentUri = 'file:///Users/user_name/dbt_project/macros_first/macro.sql';
    const secondDocumentUri = 'file:///Users/user_name/dbt_project/macros_second/macro.sql';

    shouldReturnCorrectDocumentKind(firstDocumentUri, DbtDocumentKind.MACRO);
    shouldReturnCorrectDocumentKind(secondDocumentUri, DbtDocumentKind.MACRO);
  });

  it('Should determine MODEL for documents located in default location', () => {
    const documentUri = 'file:///Users/user_name/dbt_project/models/model.sql';
    shouldReturnCorrectDocumentKind(documentUri, DbtDocumentKind.MODEL);
  });

  it('Should determine MODEL for documents located in overridden location', () => {
    dbtRepository.modelPaths = ['models_first', 'models_second'];

    const firstDocumentUri = 'file:///Users/user_name/dbt_project/models_first/model.sql';
    const secondDocumentUri = 'file:///Users/user_name/dbt_project/models_second/model.sql';

    shouldReturnCorrectDocumentKind(firstDocumentUri, DbtDocumentKind.MODEL);
    shouldReturnCorrectDocumentKind(secondDocumentUri, DbtDocumentKind.MODEL);
  });

  it("Shouldn't determine document kind in root folder", () => {
    const rootDocumentUri = 'file:///Users/user_name/dbt_project/model.sql';
    shouldReturnCorrectDocumentKind(rootDocumentUri, DbtDocumentKind.UNKNOWN);
  });

  it('Should determine document kind for documents located inside package', () => {
    const packageMacroDocumentUri = 'file:///Users/user_name/dbt_project/dbt_packages/package_name/macros/macro.sql';
    const packageModelDocumentUri = 'file:///Users/user_name/dbt_project/dbt_packages/package_name/models/model.sql';

    const packageResolveResult = path.normalize(`${PROJECT_PATH}/dbt_packages/package_name`);
    dbtDocumentKindResolver.resolveDbtPackagePath = (): string | undefined => packageResolveResult;

    shouldReturnCorrectDocumentKind(packageMacroDocumentUri, DbtDocumentKind.MACRO);
    shouldReturnCorrectDocumentKind(packageModelDocumentUri, DbtDocumentKind.MODEL);
  });

  function shouldReturnCorrectDocumentKind(documentUri: string, expectedDocumentKind: DbtDocumentKind): void {
    const dbtDocumentKind = dbtDocumentKindResolver.getDbtDocumentKind(documentUri);
    assertThat(dbtDocumentKind, expectedDocumentKind);
  }
});
