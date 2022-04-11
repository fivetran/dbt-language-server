import { MacroCompletionProvider } from '../../completion/MacroCompletionProvider';
import { DbtRepository } from '../../DbtRepository';
import { shouldProvideCompletions } from '../helper';

describe('MacroCompletionProvider', () => {
  const PROJECT_PACKAGE = 'project_package';
  const INSTALLED_PACKAGE = 'installed_package';

  let dbtRepository: DbtRepository;
  let macroCompletionProvider: MacroCompletionProvider;

  beforeEach(() => {
    dbtRepository = new DbtRepository();

    dbtRepository.projectName = PROJECT_PACKAGE;
    const macros = [
      {
        uniqueId: 'macro_1_id',
        rootPath: '/macros/macro_1.sql',
        originalFilePath: '/Users/user_name/project/macros/macro_1.sql',
        name: 'macro_1',
        packageName: PROJECT_PACKAGE,
      },
      {
        uniqueId: 'macro_2_id',
        rootPath: '/macros/macro_2.sql',
        originalFilePath: '/Users/user_name/project/macros/macro_2.sql',
        name: 'macro_2',
        packageName: PROJECT_PACKAGE,
      },
      {
        uniqueId: 'installed_package_macro_1_id',
        rootPath: '/dbt_packages/installed_package/macros/installed_package_macro_1.sql',
        originalFilePath: '/Users/user_name/project/dbt_packages/installed_package/macros/installed_package_macro_1.sql',
        name: 'installed_package_macro_1',
        packageName: INSTALLED_PACKAGE,
      },
      {
        uniqueId: 'installed_package_macro_2_id',
        rootPath: '/dbt_packages/installed_package/macros/installed_package_macro_2.sql',
        originalFilePath: '/Users/user_name/project/dbt_packages/installed_package/macros/installed_package_macro_2.sql',
        name: 'installed_package_macro_2',
        packageName: INSTALLED_PACKAGE,
      },
    ];
    dbtRepository.updateDbtNodes([], macros, []);

    macroCompletionProvider = new MacroCompletionProvider(dbtRepository);
  });

  it('Should provide completions only from specified package', async () => {
    await shouldProvideCompletions(macroCompletionProvider, `select {{ ${INSTALLED_PACKAGE}.`, [
      { label: 'installed_package_macro_1', insertText: 'installed_package_macro_1' },
      { label: 'installed_package_macro_2', insertText: 'installed_package_macro_2' },
    ]);
  });

  it('Should provide completions from all packages', async () => {
    await shouldProvideCompletions(macroCompletionProvider, `select {{ macro`, [
      { label: 'macro_1', insertText: 'macro_1' },
      { label: 'macro_2', insertText: 'macro_2' },
      { label: '(installed_package) installed_package_macro_1', insertText: 'installed_package.installed_package_macro_1' },
      { label: '(installed_package) installed_package_macro_2', insertText: 'installed_package.installed_package_macro_2' },
    ]);
  });
});
