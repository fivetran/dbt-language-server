import { instance, mock, verify, when } from 'ts-mockito';
import { Emitter, TextDocumentItem, _Connection } from 'vscode-languageserver';
import { BigQueryClient } from '../bigquery/BigQueryClient';
import { CompletionProvider } from '../CompletionProvider';
import { DbtServer } from '../DbtServer';
import { DbtTextDocument } from '../DbtTextDocument';
import { DefinitionProvider } from '../DefinitionProvider';
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
      mock(DefinitionProvider),
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
    await sleepMoreThanDebounceTime();
    verify(mockModelCompiler.compile()).once();
  });

  it('Should compile twice if debounce timeout exceeded between compile calls', async () => {
    // act
    await document.forceRecompile();
    await sleepMoreThanDebounceTime();
    await document.forceRecompile();

    // assert
    await sleepMoreThanDebounceTime();
    verify(mockModelCompiler.compile()).twice();
  });

  async function sleepMoreThanDebounceTime(): Promise<void> {
    await sleep(1.3 * DbtTextDocument.DEBOUNCE_TIMEOUT);
  }
});
