import { mock, verifyAll, when } from 'strong-mock';
import { WorkDoneProgress, _Connection } from 'vscode-languageserver';
import { ProjectProgressReporter } from '../ProjectProgressReporter';

describe('ProjectProgressReporter', () => {
  let mockConnection: _Connection;
  let reporter: ProjectProgressReporter;

  beforeEach(() => {
    mockConnection = mock<_Connection>();
    reporter = new ProjectProgressReporter(mockConnection);
  });

  afterEach(() => {
    verifyAll();
  });

  it('should send analyze begin progress', () => {
    // arrange
    when(() =>
      mockConnection.sendProgress(WorkDoneProgress.type, ProjectProgressReporter.PROJECT_PROGRESS, {
        kind: 'begin',
        title: 'Analyzing project',
      }),
    ).thenResolve();

    // act,
    reporter.sendAnalyzeBegin();
  });

  it('should send analyze progress with model count', () => {
    // arrange
    const analyzedModelsCount = 5;
    const modelsCount = 10;
    when(() =>
      mockConnection.sendProgress(WorkDoneProgress.type, ProjectProgressReporter.PROJECT_PROGRESS, {
        kind: 'report',
        message: `${analyzedModelsCount}/${modelsCount} models`,
        percentage: (analyzedModelsCount * 100) / modelsCount,
      }),
    ).thenResolve();

    // act, assert
    reporter.sendAnalyzeProgress(analyzedModelsCount, modelsCount);
  });

  it('should send analyze end progress', () => {
    // arrange
    when(() =>
      mockConnection.sendProgress(WorkDoneProgress.type, ProjectProgressReporter.PROJECT_PROGRESS, {
        kind: 'end',
      }),
    ).thenResolve();

    // act, assert
    reporter.sendAnalyzeEnd();
  });
});
