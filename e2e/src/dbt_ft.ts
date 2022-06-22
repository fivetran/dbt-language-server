import * as Mocha from 'mocha';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { languages, Uri } from 'vscode';
import { closeAllEditors, doc, getPreviewText, PREVIEW_URI } from './helper';

export async function run(): Promise<void> {
  await closeAllEditors();

  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    bail: true,
    timeout: '0',
    slow: 15000,
  });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();

    mocha.addFile(path.resolve(testsRoot, 'dbt_ft.spec.js'));
    try {
      // Run the mocha test
      const runner = mocha.run(failures => {
        console.log(`E2E tests duration: ${(performance.now() - startTime) / 1000} seconds.`);
        if (failures > 0) {
          reject(new Error(`${failures} tests failed.`));
        } else {
          resolve();
        }
      });
      runner.on('fail', () => {
        try {
          console.log(`Content of document when test failed:\n${doc.getText()}`);
          console.log(`Preview content:\n${getPreviewText()}`);
          console.log(`Preview diagnostics:\n${JSON.stringify(languages.getDiagnostics(Uri.parse(PREVIEW_URI)))}`);
        } catch (err) {
          // do nothing
        }
      });
    } catch (err) {
      console.error(err);
      reject(err);
    }
  });
}
