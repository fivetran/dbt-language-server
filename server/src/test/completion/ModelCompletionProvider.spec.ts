import { ModelCompletionProvider } from '../../completion/ModelCompletionProvider';
import { Dag } from '../../dag/Dag';
import { DagNode } from '../../dag/DagNode';
import { DbtRepository } from '../../DbtRepository';
import { JinjaPartType } from '../../JinjaParser';
import { ManifestModel } from '../../manifest/ManifestJson';
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
    dbtRepository = new DbtRepository('/Users/user_name/project');

    dbtRepository.projectName = PROJECT_PACKAGE;
    const models: ManifestModel[] = [
      createModel('model_1_id', 'models/model_1.sql', 'model_1', PROJECT_PACKAGE),
      createModel('model_2_id', 'models/model_2.sql', 'model_2', PROJECT_PACKAGE),
      createModel('installed_package_model_1_id', 'models/installed_package_model_1.sql', 'installed_package_model_1', INSTALLED_PACKAGE),
      createModel('installed_package_model_2_id', 'models/installed_package_model_2.sql', 'installed_package_model_2', INSTALLED_PACKAGE),
    ];
    dbtRepository.updateDbtNodes([], [], new Dag(models.map(m => new DagNode(m))));

    modelCompletionProvider = new ModelCompletionProvider(dbtRepository);
  });

  it('Should provide completions only from specified package', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, `select * from {{ ref('${INSTALLED_PACKAGE}', '`, [
      { label: 'installed_package_model_1', insertText: 'installed_package_model_1' },
      { label: 'installed_package_model_2', insertText: 'installed_package_model_2' },
    ]);
  });

  it('Should provide completions from all packages after pressing (', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, 'select * from {{ ref(', [
      { label: labelModel1, insertText: "'model_1'" },
      { label: labelModel2, insertText: "'model_2'" },
      { label: installedPackageModel1, insertText: "'installed_package', 'installed_package_model_1'" },
      { label: installedPackageModel2, insertText: "'installed_package', 'installed_package_model_2'" },
    ]);
  });

  it("Should provide completions from all packages after pressing '", () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, "select * from {{ ref('", [
      { label: labelModel1, insertText: 'model_1' },
      { label: labelModel2, insertText: 'model_2' },
      { label: installedPackageModel1, insertText: "installed_package', 'installed_package_model_1" },
      { label: installedPackageModel2, insertText: "installed_package', 'installed_package_model_2" },
    ]);
  });

  it('Should provide completions from all packages after pressing "', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, 'select * from {{ ref("', [
      { label: labelModel1, insertText: 'model_1' },
      { label: labelModel2, insertText: 'model_2' },
      { label: installedPackageModel1, insertText: 'installed_package", "installed_package_model_1' },
      { label: installedPackageModel2, insertText: 'installed_package", "installed_package_model_2' },
    ]);
  });

  it("Shouldn't provide completions for unknown package", () => {
    shouldNotProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, "select * from {{ ref('unknown_package', '");
  });

  it("Shouldn't provide completions for empty strings", () => {
    shouldNotProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, 'select {{ ');
  });

  it("Shouldn't provide completions after ref", () => {
    shouldNotProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, 'select {{ ref');
  });

  it('Should provide completions after typing model name after quote', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, "select {{ ref('model_", [
      { label: labelModel1, insertText: 'model_1' },
      { label: labelModel2, insertText: 'model_2' },
      { label: installedPackageModel1, insertText: "installed_package', 'installed_package_model_1" },
      { label: installedPackageModel2, insertText: "installed_package', 'installed_package_model_2" },
    ]);
  });

  it('Should provide completions after typing package name after quote', () => {
    shouldProvideCompletions(modelCompletionProvider, JinjaPartType.EXPRESSION_START, "select {{ ref('installed_package', 'model_", [
      { label: 'installed_package_model_1', insertText: 'installed_package_model_1' },
      { label: 'installed_package_model_2', insertText: 'installed_package_model_2' },
    ]);
  });
});

function createModel(uniqueId: string, originalFilePath: string, name: string, packageName: string): ManifestModel {
  return {
    uniqueId,
    originalFilePath,
    name,
    packageName,
    database: 'database',
    schema: 'schema',
    rawCode: 'raw_sql',
    compiledCode: 'compiled_sql',
    dependsOn: {
      nodes: [],
    },
    refs: [],
  };
}
