import * as glob from 'glob';
import * as Mocha from 'mocha';
import * as path from 'path';
import { performance } from 'perf_hooks';

export function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    bail: true,
    timeout: '70s',
  });

  const testsRoot = __dirname;

  return new Promise((resolve, reject) => {
    const startTime = performance.now();
    glob('**.spec.js', { cwd: testsRoot }, (e, files) => {
      if (e) {
        reject(e);
      }

      // Add files to the test suite
      for (const f of files) {
        mocha.addFile(path.resolve(testsRoot, f));
      }

      try {
        // Run the mocha test
        mocha.run(failures => {
          console.log(`E2E tests duration: ${(performance.now() - startTime) / 1000} seconds.`);
          if (failures > 0) {
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
