import { SourceCompletionProvider } from '../../completion/SourceCompletionProvider';
import { DbtRepository } from '../../DbtRepository';
import { shouldProvideCompletions } from '../helper';

describe('SourceCompletionProvider', () => {
  const PROJECT_PACKAGE = 'project_package';
  const INSTALLED_PACKAGE = 'installed_package';

  let dbtRepository: DbtRepository;
  let sourceCompletionProvider: SourceCompletionProvider;

  beforeEach(() => {
    dbtRepository = new DbtRepository();

    dbtRepository.projectName = PROJECT_PACKAGE;
    dbtRepository.sources = [
      {
        uniqueId: 'source_1_1_id',
        rootPath: '/sources/source_1.sql',
        originalFilePath: '/Users/user_name/project/sources/source_1.sql',
        name: 'table_1',
        packageName: PROJECT_PACKAGE,
        sourceName: 'source_1',
        columns: [],
      },
      {
        uniqueId: 'source_1_2_id',
        rootPath: '/sources/source_1.sql',
        originalFilePath: '/Users/user_name/project/sources/source_1.sql',
        name: 'table_2',
        packageName: PROJECT_PACKAGE,
        sourceName: 'source_1',
        columns: [],
      },
      {
        uniqueId: 'installed_package_source_1_1_id',
        rootPath: '/dbt_packages/installed_package/sources/installed_package_source_1.sql',
        originalFilePath: '/Users/user_name/project/dbt_packages/installed_package/sources/installed_package_source_1.sql',
        name: 'installed_package_source_table_1',
        packageName: INSTALLED_PACKAGE,
        sourceName: 'package_source_1',
        columns: [],
      },
      {
        uniqueId: 'installed_package_source_1_2_id',
        rootPath: '/dbt_packages/installed_package/sources/installed_package_source_1.sql',
        originalFilePath: '/Users/user_name/project/dbt_packages/installed_package/sources/installed_package_source_1.sql',
        name: 'installed_package_source_table_2',
        packageName: INSTALLED_PACKAGE,
        sourceName: 'package_source_1',
        columns: [],
      },
    ];
    dbtRepository.groupManifestNodes();

    sourceCompletionProvider = new SourceCompletionProvider(dbtRepository);
  });

  it('Should provide sources by pressing (', async () => {
    await shouldProvideCompletions(sourceCompletionProvider, `select * from {{ source(`, [
      { label: '(project_package) source_1', insertText: `'source_1'` },
      { label: '(installed_package) package_source_1', insertText: `'package_source_1'` },
    ]);
  });

  it(`Should provide sources by pressing '`, async () => {
    await shouldProvideCompletions(sourceCompletionProvider, `select * from {{ source('`, [
      { label: '(project_package) source_1', insertText: `source_1` },
      { label: '(installed_package) package_source_1', insertText: `package_source_1` },
    ]);
  });

  it('Should provide source tables', async () => {
    await shouldProvideCompletions(sourceCompletionProvider, `select * from {{ source('source_1', '`, [
      { label: 'table_1', insertText: `table_1` },
      { label: 'table_2', insertText: `table_2` },
    ]);
  });
});
