import { MacroCompletionProvider } from '../../completion/MacroCompletionProvider';
import { Dag } from '../../dag/Dag';
import { DbtRepository } from '../../DbtRepository';
import { JinjaPartType } from '../../JinjaParser';
import { shouldNotProvideCompletions, shouldProvideCompletions } from '../helper';

describe('MacroCompletionProvider', () => {
  const PROJECT_PACKAGE = 'project_package';
  const INSTALLED_PACKAGE = 'installed_package';

  let dbtRepository: DbtRepository;
  let macroCompletionProvider: MacroCompletionProvider;

  beforeEach(() => {
    dbtRepository = new DbtRepository('/Users/user_name/project', Promise.resolve(undefined));

    dbtRepository.projectName = PROJECT_PACKAGE;
    const macros = [
      {
        uniqueId: 'macro_1_id',
        originalFilePath: 'macros/macro_1.sql',
        name: 'macro_1',
        packageName: PROJECT_PACKAGE,
      },
      {
        uniqueId: 'macro_2_id',
        originalFilePath: 'macros/macro_2.sql',
        name: 'macro_2',
        packageName: PROJECT_PACKAGE,
      },
      {
        uniqueId: 'installed_package_macro_1_id',
        originalFilePath: 'macros/installed_package_macro_1.sql',
        name: 'installed_package_macro_1',
        packageName: INSTALLED_PACKAGE,
      },
      {
        uniqueId: 'installed_package_macro_2_id',
        originalFilePath: 'macros/installed_package_macro_2.sql',
        name: 'installed_package_macro_2',
        packageName: INSTALLED_PACKAGE,
      },
    ];
    dbtRepository.updateDbtNodes(macros, [], new Dag([]));

    macroCompletionProvider = new MacroCompletionProvider(dbtRepository);
  });

  it('Should provide completions only from specified package', () => {
    shouldProvideCompletions(macroCompletionProvider, JinjaPartType.EXPRESSION_START, `select {{ ${INSTALLED_PACKAGE}.`, [
      { label: 'installed_package_macro_1', insertText: 'installed_package_macro_1' },
      { label: 'installed_package_macro_2', insertText: 'installed_package_macro_2' },
    ]);
  });

  it('Should provide completions from all packages', () => {
    shouldProvideCompletions(macroCompletionProvider, JinjaPartType.EXPRESSION_START, 'select {{ macro', [
      { label: 'macro_1', insertText: 'macro_1' },
      { label: 'macro_2', insertText: 'macro_2' },
      { label: '(installed_package) installed_package_macro_1', insertText: 'installed_package.installed_package_macro_1' },
      { label: '(installed_package) installed_package_macro_2', insertText: 'installed_package.installed_package_macro_2' },
    ]);
  });

  it("Shouldn't provide completions for unknown package", () => {
    shouldNotProvideCompletions(macroCompletionProvider, JinjaPartType.EXPRESSION_START, 'select {{ unknown_package.');
  });

  it("Shouldn't provide completions for empty strings", () => {
    shouldNotProvideCompletions(macroCompletionProvider, JinjaPartType.EXPRESSION_START, 'select {{ ');
  });
});
