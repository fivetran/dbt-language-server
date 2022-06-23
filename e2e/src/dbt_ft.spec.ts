import { writeFileSync } from 'fs';
import * as glob from 'glob';
import { DiagnosticSeverity, languages, Uri } from 'vscode';
import { activateAndWait } from './helper';
import path = require('path');

export const PROJECT_PATH = path.resolve(__dirname, '../../analytics/dbt_ft_prod');

suite('dbt_ft', () => {
  const EXCLUDE = ['dbt_ft_prod/models/bi_core/accounts.sql', 'dbt_ft_prod/models/bi_core/monthly_employee_metrics.sql'];

  test('Should compile all models in analytics repo', async () => {
    const files = glob.sync(path.resolve(PROJECT_PATH, 'models/**/*.sql'), { nodir: true });
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
      writeFileSync('log.txt', `${file}, ${diagnostics.length}\n`, {
        flag: 'a+',
      });
      if (diagnostics.filter(d => d.severity === DiagnosticSeverity.Error).length > 0) {
        writeFileSync('diagnostics.txt', `${file}, ${diagnostics.length}\n${JSON.stringify(diagnostics)}`, {
          flag: 'a+',
        });
      }
      if (diagnostics.length > 0) {
        console.log(`diagnostics: ${JSON.stringify(diagnostics)}`);
      }
    }
  });
});
