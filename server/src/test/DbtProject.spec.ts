import { assertThat } from 'hamjest';
import { spy, verify } from 'ts-mockito';
import { DbtProject } from '../DbtProject';
import { YamlParserUtils } from '../YamlParserUtils';

describe('DbtProject', () => {
  const PROJECT_PATH = '/Users/user_name/projects/project_name';

  let dbtProjectInstance: DbtProject;
  let spiedDbtProject: DbtProject;
  let parseYamlFileCalls = 0;

  beforeEach(() => {
    dbtProjectInstance = new DbtProject(PROJECT_PATH);
    spiedDbtProject = spy(dbtProjectInstance);

    YamlParserUtils.parseYamlFile = (_filePath: string): { name: string } => {
      parseYamlFileCalls++;
      return { name: 'project_name' };
    };

    parseYamlFileCalls = 0;
  });

  it('findProjectName should call parseYamlFile once', () => {
    dbtProjectInstance.findProjectName();
    dbtProjectInstance.findProjectName();

    verify(spiedDbtProject.getProject()).times(2);
    assertThat(parseYamlFileCalls, 1);
  });

  it('findProjectName should call parseYamlFile when parsedProject exists but outdated', () => {
    dbtProjectInstance.findProjectName();
    dbtProjectInstance.setParsedProjectOutdated();
    dbtProjectInstance.findProjectName();

    verify(spiedDbtProject.getProject()).times(2);
    assertThat(parseYamlFileCalls, 2);
  });
});
