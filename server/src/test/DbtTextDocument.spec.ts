import { instance, mock, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentItem, _Connection } from 'vscode-languageserver';
import { BigQueryClient } from '../bigquery/BigQueryClient';
import { CompletionProvider } from '../CompletionProvider';
import { DbtServer } from '../DbtServer';
import { DbtTextDocument } from '../DbtTextDocument';
import { ModelCompiler } from '../ModelCompiler';
import { ProgressReporter } from '../ProgressReporter';
import { sleep } from './helper';

describe('DbtTextDocument', () => {
  let document: DbtTextDocument;
  let mockModelCompiler: ModelCompiler;

  beforeEach(async () => {
    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onFinishAllCompilationTasks).thenReturn(new Emitter<void>().event);

    document = new DbtTextDocument(
      mock(TextDocumentItem),
      mock(DbtServer),
      mock<_Connection>(),
      mock(ProgressReporter),
      mock(CompletionProvider),
      instance(mockModelCompiler),
      mock(BigQueryClient),
    );
  });

  it('Should compile only once', async () => {
    // act
    await document.forceRecompile();
    await document.forceRecompile();
    await document.forceRecompile();
    await document.forceRecompile();

    // assert
    await sleep(DbtTextDocument.DEBOUNCE_TIMEOUT);
    verify(mockModelCompiler.compile()).once();
  });

  it('Should compile twice if debounce timeout exceeded between compile calls', async () => {
    // act
    await document.forceRecompile();
    await sleep(DbtTextDocument.DEBOUNCE_TIMEOUT);
    await document.forceRecompile();

    // assert
    await sleep(DbtTextDocument.DEBOUNCE_TIMEOUT);
    verify(mockModelCompiler.compile()).twice();
  });
});
