import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { languages, Uri } from 'vscode';
import { closeAllEditors, doc, getPreviewText, initializeExtension, PREVIEW_URI } from '../helper';

const TESTS_WITHOUT_ZETASQL = [
  'completion_macros.spec.js',
  'completion_models.spec.js',
  'completion_sources.spec.js',
  'certain_version.spec.js',
  'dbt_compile.spec.js',
  'dbt_error.spec.js',
  'dbt_packages.spec',
  'definition.spec',
  'editing_outside_jinja.spec',
  'functions.spec',
  'multi-project.spec.js',
  'postgres.spec.js',
  'signature_help.spec.js',
]; // TODO: combine ZetaSQL tests and skip them on Windows
const ZETASQL_SUPPORTED_PLATFORMS = ['darwin', 'linux'];

export async function indexMain(timeout: string, globPattern: string, doNotRun: string[]): Promise<void> {
  try {
    await initializeExtension();
  } catch (e) {
    const errorMessage = `Failed to initialize extension. Error: ${e instanceof Error ? e.message : String(e)}`;
    console.log(errorMessage);
    throw new Error(errorMessage);
  }

  await closeAllEditors();

  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    bail: true,
    timeout,
    slow: 15000,
  });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    glob(globPattern, { cwd: testsRoot }, (e, files) => {
      if (e) {
        reject(e);
      }

      // Add files to the test suite
      files
        .filter(
          f =>
            (ZETASQL_SUPPORTED_PLATFORMS.includes(process.platform) || TESTS_WITHOUT_ZETASQL.find(t => f.endsWith(t))) &&
            !doNotRun.find(t => f.endsWith(t)),
        )
        .forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

      console.log(`List of tests (${mocha.files.length}):`);
      console.log(JSON.stringify(mocha.files));

      try {
        // Run the mocha test
        mocha.run(failures => {
          console.log(`E2E tests duration: ${(performance.now() - startTime) / 1000} seconds.`);
          if (failures > 0) {
            try {
              console.log(`Content of document when test failed:\n|${doc.getText()}|\n`);
              console.log(`Preview content:\n|${getPreviewText()}|\n`);
              console.log(`Preview diagnostics:\n|${JSON.stringify(languages.getDiagnostics(Uri.parse(PREVIEW_URI)))}|\n`);
            } catch (err) {
              console.log(`Error in fail stage: ${err instanceof Error ? err.message : String(err)}`);
            }
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (err) {
        console.error(err);
        reject(err);
      }
    });
  });
}
