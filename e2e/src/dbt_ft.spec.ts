import { writeFileSync } from 'fs';
import * as glob from 'glob';
import { DiagnosticSeverity, languages, Uri } from 'vscode';
import { activateAndWait } from './helper';
import path = require('path');

suite('dbt_ft', () => {
  const EXCLUDE = ['dbt_ft_prod/models/bi_core/accounts.sql', 'dbt_ft_prod/models/bi_core/monthly_employee_metrics.sql'];

  test('Should compile all models in analytics repo', async () => {
    const files = glob.sync(path.resolve(getProjectPath(), 'models/**/*.sql'), { nodir: true });
    console.log(`Count: ${files.length}`);
    files.forEach(f => console.log(f));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`File: ${file}`);

      if (EXCLUDE.find(e => file.endsWith(e))) {
        console.log(`Skipping: ${file}`);
        continue;
      }

      const uri = Uri.file(file);
      await activateAndWait(uri);

      const diagnostics = languages.getDiagnostics(uri);
      writeFileSync(getLogPath(), `${new Date().toISOString()}: ${file}, ${diagnostics.length}\n`, {
        flag: 'a+',
      });
      if (diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length > 0) {
        writeFileSync(getDiagnosticsPath(), `${new Date().toISOString()}: ${file}, ${diagnostics.length}\n${JSON.stringify(diagnostics)}\n\n`, {
          flag: 'a+',
        });
      }
      if (diagnostics.length > 0) {
        console.log(`${new Date().toISOString()}: diagnostics: ${JSON.stringify(diagnostics)}`);
      }
    }
  });

  function isRunningOnCi(): boolean {
    return !process.env['LOCAL_RUN'];
  }

  function getLogPath(): string {
    return getPath('log.txt');
  }

  function getDiagnosticsPath(): string {
    return getPath('diagnostics.txt');
  }

  function getPath(fileName: string): string {
    return path.resolve(__dirname, fileName);
  }

  function getProjectPath(): string {
    return isRunningOnCi() ? path.resolve(__dirname, '../../analytics/dbt_ft_prod') : path.resolve(__dirname, '../../../analytics/dbt_ft_prod');
  }
});
