import { instance, mock, objectContaining, when } from 'ts-mockito';
import { WorkDoneProgress, _Connection } from 'vscode-languageserver';
import { ProjectProgressReporter } from '../ProjectProgressReporter';

describe('ProjectProgressReporter', () => {
  let mockConnection: _Connection;
  let reporter: ProjectProgressReporter;

  beforeEach(() => {
    mockConnection = mock<_Connection>();
    reporter = new ProjectProgressReporter(instance(mockConnection));
  });

  it('should send analyze begin progress', () => {
    // arrange
    when(
      mockConnection.sendProgress(
        WorkDoneProgress.type,
        ProjectProgressReporter.PROJECT_PROGRESS,
        objectContaining({
          kind: 'begin',
          title: 'Analyzing project',
        }),
      ),
    ).thenResolve();

    // act, assert
    reporter.sendAnalyzeBegin();
  });

  it('should send analyze progress with model count', () => {
    // arrange
    const analyzedModelCount = 5;
    const modelCount = 10;
    when(
      mockConnection.sendProgress(
        WorkDoneProgress.type,
        ProjectProgressReporter.PROJECT_PROGRESS,
        objectContaining({
          kind: 'report',
          message: `${analyzedModelCount}/${modelCount} models`,
          percentage: (analyzedModelCount * 100) / modelCount,
        }),
      ),
    ).thenResolve();

    // act, assert
    reporter.sendAnalyzeProgress(analyzedModelCount, modelCount);
  });

  it('should send analyze end progress', () => {
    // arrange
    when(
      mockConnection.sendProgress(
        WorkDoneProgress.type,
        ProjectProgressReporter.PROJECT_PROGRESS,
        objectContaining({
          kind: 'end',
        }),
      ),
    ).thenResolve();

    // act, assert
    reporter.sendAnalyzeEnd();
  });
});
