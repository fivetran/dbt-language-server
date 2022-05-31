import { ModelCompletionProvider } from '../../completion/ModelCompletionProvider';
import { DbtRepository } from '../../DbtRepository';
import { JinjaPartType } from '../../JinjaParser';
import { shouldNotProvideCompletions, shouldProvideCompletions } from '../helper';

describe('ModelCompletionProvider', () => {
  const PROJECT_PACKAGE = 'project_package';
  const INSTALLED_PACKAGE = 'installed_package';

  const labelModel1 = '(project_package) model_1';
  const labelModel2 = '(project_package) model_2';
  const installedPackageModel1 = '(installed_package) installed_package_model_1';
  const installedPackageModel2 = '(installed_package) installed_package_model_2';

  let dbtRepository: DbtRepository;
  let modelCompletionProvider: ModelCompletionProvider;

  beforeEach(() => {
    dbtRepository = new DbtRepository();

    dbtRepository.projectName = PROJECT_PACKAGE;
    const models = [
      {
        uniqueId: 'model_1_id',
        rootPath: '/models/model_1.sql',
        originalFilePath: '/Users/user_name/project/models/model_1.sql',
        name: 'model_1',
        packageName: PROJECT_PACKAGE,
        database: 'database',
        schema: 'schema',
      },
      {
        uniqueId: 'model_2_id',
        rootPath: '/models/model_2.sql',
        originalFilePath: '/Users/user_name/project/models/model_2.sql',
        name: 'model_2',
        packageName: PROJECT_PACKAGE,
        database: 'database',
        schema: 'schema',
      },
      {
        uniqueId: 'installed_package_model_1_id',
        rootPath: '/dbt_packages/installed_package/models/installed_package_model_1.sql',
        originalFilePath: '/Users/user_name/project/dbt_packages/installed_package/models/installed_package_model_1.sql',
        name: 'installed_package_model_1',
        packageName: INSTALLED_PACKAGE,
        database: 'database',
        schema: 'schema',
      },
      {
        uniqueId: 'installed_package_model_2_id',
        rootPath: '/dbt_packages/installed_package/models/installed_package_model_2.sql',
        originalFilePath: '/Users/user_name/project/dbt_packages/installed_package/models/installed_package_model_2.sql',
        name: 'installed_package_model_2',
        packageName: INSTALLED_PACKAGE,
        database: 'database',
        schema: 'schema',
      },
    ];
    dbtRepository.updateDbtNodes(models, [], []);

    modelCompletionProvider = new ModelCompletionProvider(dbtRepository);
  });

  it('Should provide completions only from specified package', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select * from {{ ref('${INSTALLED_PACKAGE}', '`, [
      { label: 'installed_package_model_1', insertText: 'installed_package_model_1' },
      { label: 'installed_package_model_2', insertText: 'installed_package_model_2' },
    ]);
  });

  it('Should provide completions from all packages after pressing (', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select * from {{ ref(`, [
      { label: labelModel1, insertText: `'model_1'` },
      { label: labelModel2, insertText: `'model_2'` },
      { label: installedPackageModel1, insertText: `'installed_package', 'installed_package_model_1'` },
      { label: installedPackageModel2, insertText: `'installed_package', 'installed_package_model_2'` },
    ]);
  });

  it(`Should provide completions from all packages after pressing '`, () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select * from {{ ref('`, [
      { label: labelModel1, insertText: 'model_1' },
      { label: labelModel2, insertText: 'model_2' },
      { label: installedPackageModel1, insertText: `installed_package', 'installed_package_model_1` },
      { label: installedPackageModel2, insertText: `installed_package', 'installed_package_model_2` },
    ]);
  });

  it(`Should provide completions from all packages after pressing "`, () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select * from {{ ref("`, [
      { label: labelModel1, insertText: 'model_1' },
      { label: labelModel2, insertText: 'model_2' },
      { label: installedPackageModel1, insertText: `installed_package", "installed_package_model_1` },
      { label: installedPackageModel2, insertText: `installed_package", "installed_package_model_2` },
    ]);
  });

  it(`Shouldn't provide completions for unknown package`, () => {
    shouldNotProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select * from {{ ref('unknown_package', '`);
  });

  it(`Shouldn't provide completions for empty strings`, () => {
    shouldNotProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, 'select {{ ');
  });

  it(`Shouldn't provide completions after ref`, () => {
    shouldNotProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, 'select {{ ref');
  });

  it('Should provide completions after typing model name after quote', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select {{ ref('model_`, [
      { label: labelModel1, insertText: `model_1` },
      { label: labelModel2, insertText: `model_2` },
      { label: installedPackageModel1, insertText: `installed_package', 'installed_package_model_1` },
      { label: installedPackageModel2, insertText: `installed_package', 'installed_package_model_2` },
    ]);
  });

  it('Should provide completions after typing package name after quote', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select {{ ref('installed_package', 'model_`, [
      { label: 'installed_package_model_1', insertText: 'installed_package_model_1' },
      { label: 'installed_package_model_2', insertText: 'installed_package_model_2' },
    ]);
  });
});
