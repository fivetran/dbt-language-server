import * as glob from 'glob';
import { assertThat, containsString, isEmpty } from 'hamjest';
import * as fs from 'node:fs';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { DiagnosticSeverity, languages, Uri } from 'vscode';
import { activateAndWait, sleep } from './helper';

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
    await sleep(1000 * 60 * 5);

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
        console.log(`${diagnostic.message}: [${diagnostic.range.start.line}, ${diagnostic.range.start.character}]`);
      }
      console.log();
    }

    assertThat(errorCount, 0);

    const files = glob.sync(path.resolve(getProjectPath(), '../../.vscode-test/user-data/logs/**/*Wizard for dbt Core (TM).log'), { nodir: true });
    assertThat(files.length, 1);
    const content = fs.readFileSync(files[0]);
    assertThat(content, containsString('0 errors found during analysis'));
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
