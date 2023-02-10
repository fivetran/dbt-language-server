import * as glob from 'glob';
import { assertThat, containsString, isEmpty } from 'hamjest';
import * as fs from 'node:fs';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { DiagnosticSeverity, languages, Uri } from 'vscode';
import { activateAndWait, sleep, waitWithTimeout } from './helper';

suite('dbt_ft', () => {
  const EXCLUDE = ['Add here the file paths to exclude from testing'];

  test.skip('Should compile all models in analytics repo one by one', async () => {
    const files = glob.sync(path.resolve(getProjectPath(), 'models/**/*.sql'), { nodir: true });
    console.log(`Count: ${files.length}`);
    files.forEach(f => console.log(f));

    const errors = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (EXCLUDE.some(e => file.endsWith(e))) {
        console.log(`Skipping: ${file}`);
      } else {
        const fileProcessingTimeout = new Promise<string>((resolve, _reject) => {
          setTimeout(() => {
            resolve(`Something went wrong when opening model ${file}`);
          }, 1000 * 60 * 3);
        });

        const uri = Uri.file(file);
        const result = await Promise.race([activateAndWait(uri), fileProcessingTimeout]);

        if (typeof result === 'string') {
          writeFileSync(getLogPath(), `${new Date().toISOString()}: ${result}\n`, {
            flag: 'a+',
          });
          writeFileSync(getDiagnosticsPath(), `${new Date().toISOString()}: ${result}\n\n`, {
            flag: 'a+',
          });
        } else {
          const diagnostics = languages.getDiagnostics(uri);
          writeFileSync(getLogPath(), `${new Date().toISOString()}: ${file}, ${diagnostics.length}\n`, {
            flag: 'a+',
          });
          if (diagnostics.some(d => d.severity === DiagnosticSeverity.Error)) {
            const log = `${new Date().toISOString()}: ${file}, ${diagnostics.length}\n${JSON.stringify(diagnostics)}\n\n`;
            writeFileSync(getDiagnosticsPath(), log, { flag: 'a+' });
            console.log(log);
            errors.push(log);
          }

          if (diagnostics.length > 0) {
            console.log(`${new Date().toISOString()}: diagnostics: ${JSON.stringify(diagnostics)}`);
          }
        }
      }
    }
    assertThat(errors, isEmpty());
  });

  test('Should compile and analyze all models at start', async () => {
    await sleep(1000 * 60 * 1);
    const files = glob.sync(path.resolve(getProjectPath(), '../../.vscode-test/user-data/logs/**/*Wizard for dbt Core (TM).log'), { nodir: true });

    const analyzeFinishedPromise = isRunningOnCi()
      ? new Promise<void>(resolve => {
          fs.watch(files[0], () => {
            const content = fs.readFileSync(files[0], 'utf8');
            if (content.includes('errors found during analysis')) {
              resolve();
            }
          });
        })
      : new Promise<void>(() => {
          // Do nothing
        });

    const timeout = 1000 * 60 * (isRunningOnCi() ? 20 : 4);
    console.log(`Start analyzing with timeout ${timeout} ms`);
    await waitWithTimeout(analyzeFinishedPromise, timeout);

    const allDiagnostics = languages.getDiagnostics();

    let errorCount = 0;
    for (const diagnosticWithUri of allDiagnostics) {
      const uri = diagnosticWithUri[0];
      const diagnostics = diagnosticWithUri[1];
      if (diagnostics.length > 0) {
        console.log(uri.fsPath);
      }
      errorCount += diagnostics.length;
      for (const diagnostic of diagnostics) {
        console.log(`${diagnostic.message}: [at ${diagnostic.range.start.line}:${diagnostic.range.start.character}]`);
      }
      console.log();
    }

    assertThat(errorCount, 0);

    if (isRunningOnCi()) {
      assertThat(files.length, 1);
      const content = fs.readFileSync(files[0], 'utf8');
      assertThat(content, containsString('0 errors found during analysis'));
      console.log('0 errors found during analysis');
    }
  });
});

function getLogPath(): string {
  return getPath('log.txt');
}

function getDiagnosticsPath(): string {
  return getPath('diagnostics.txt');
}

function getProjectPath(): string {
  return isRunningOnCi() ? path.resolve(__dirname, '../../analytics/dbt_ft_prod') : path.resolve(__dirname, '../../../analytics/dbt_ft_prod');
}

function isRunningOnCi(): boolean {
  return !process.env['LOCAL_RUN'];
}

function getPath(fileName: string): string {
  return path.resolve(__dirname, fileName);
}
