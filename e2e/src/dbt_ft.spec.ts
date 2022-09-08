import * as glob from 'glob';
import { writeFileSync } from 'node:fs';
import * as path from 'node:path';
import { DiagnosticSeverity, languages, Uri } from 'vscode';
import { activateAndWait } from './helper';

suite('dbt_ft', () => {
  const EXCLUDE = [
    'dbt_ft_prod/models/bi_core/accounts.sql',
    'dbt_ft_prod/models/bi_core/monthly_employee_metrics.sql',
    'dbt_ft_prod/models/bi_core/dbt_projects_timeline.sql',
    'dbt_ft_prod/models/bi_core/transformations_timeline.sql',
    'dbt_ft_prod/models/dbt_root/model_wh/fivetran_transformations/dbt_job_runs_by_step.sql',
  ];

  test('Should compile all models in analytics repo', async () => {
    const files = glob.sync(path.resolve(getProjectPath(), 'models/**/*.sql'), { nodir: true });
    console.log(`Count: ${files.length}`);
    files.forEach(f => console.log(f));

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`File: ${file}`);

      if (!EXCLUDE.some(e => file.endsWith(e))) {
        const fileProcessingTimeout = new Promise<void>((_resolve, reject) => {
          setTimeout(() => {
            reject(new Error(`Something went wrong when opening model ${file}`));
          }, 1000 * 60 * 5);
        });

        const uri = Uri.file(file);
        await Promise.race([activateAndWait(uri), fileProcessingTimeout]);

        const diagnostics = languages.getDiagnostics(uri);
        writeFileSync(getLogPath(), `${new Date().toISOString()}: ${file}, ${diagnostics.length}\n`, {
          flag: 'a+',
        });
        if (diagnostics.some(d => d.severity === DiagnosticSeverity.Error)) {
          writeFileSync(getDiagnosticsPath(), `${new Date().toISOString()}: ${file}, ${diagnostics.length}\n${JSON.stringify(diagnostics)}\n\n`, {
            flag: 'a+',
          });
        }
        if (diagnostics.length > 0) {
          console.log(`${new Date().toISOString()}: diagnostics: ${JSON.stringify(diagnostics)}`);
        }
      } else {
        console.log(`Skipping: ${file}`);
      }
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
