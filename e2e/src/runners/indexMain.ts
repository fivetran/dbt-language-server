import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'node:path';
import { performance } from 'node:perf_hooks';
import { languages, Uri } from 'vscode';
import { closeAllEditors, doc, getPreviewText, initializeExtension, PREVIEW_URI } from '../helper';

export async function indexMain(timeout: string, globPattern: string, doNotRun: string[]): Promise<void> {
  console.log(`Platform: ${process.platform}`);
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
    slow: 15_000,
  });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    glob(globPattern, { cwd: testsRoot }, (e, files) => {
      if (e) {
        reject(e);
      }

      console.log(`${files.length} test files found`);
      // Add files to the test suite
      files.filter(f => !doNotRun.some(t => f.endsWith(t))).forEach(f => mocha.addFile(path.resolve(testsRoot, f)));

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
            } catch (e_) {
              console.log(`Error in fail stage: ${e_ instanceof Error ? e_.message : String(e_)}`);
            }
            reject(new Error(`${failures} tests failed.`));
          } else {
            resolve();
          }
        });
      } catch (e_) {
        console.error(e_);
        reject(e_);
      }
    });
  });
}
