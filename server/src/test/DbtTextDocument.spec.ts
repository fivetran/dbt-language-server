import { instance, mock, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentItem, _Connection } from 'vscode-languageserver';
import { BigQueryClient } from '../bigquery/BigQueryClient';
import { CompletionProvider } from '../CompletionProvider';
import { DbtTextDocument } from '../DbtTextDocument';
import { ModelCompiler } from '../ModelCompiler';
import { ProgressReporter } from '../ProgressReporter';
import { sleep } from './helper';

describe('DbtTextDocument', () => {
  let document: DbtTextDocument;
  let mockModelCompiler: ModelCompiler;

  beforeEach(async () => {
    DbtTextDocument.DEBOUNCE_TIMEOUT = 1;

    mockModelCompiler = mock(ModelCompiler);
    when(mockModelCompiler.onCompilationError).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onCompilationFinished).thenReturn(new Emitter<string>().event);
    when(mockModelCompiler.onFinishAllCompilationJobs).thenReturn(new Emitter<void>().event);

    document = new DbtTextDocument(
      mock(TextDocumentItem),
      mock<_Connection>(),
      mock(ProgressReporter),
      mock(CompletionProvider),
      instance(mockModelCompiler),
      mock(BigQueryClient),
    );
  });

  it('Should compile only once', async () => {
    // act
    document.forceRecompile();
    document.forceRecompile();
    document.forceRecompile();
    document.forceRecompile();

    // assert
    await sleepMoreThanDebounceTime();
    verify(mockModelCompiler.compile()).once();
  });

  it('Should compile twice if debounce timeout exceeded between compile calls', async () => {
    // act
    document.forceRecompile();
    await sleepMoreThanDebounceTime();
    document.forceRecompile();

    // assert
    await sleepMoreThanDebounceTime();
    verify(mockModelCompiler.compile()).twice();
  });

  async function sleepMoreThanDebounceTime(): Promise<void> {
    await sleep(2 * DbtTextDocument.DEBOUNCE_TIMEOUT);
  }
});
