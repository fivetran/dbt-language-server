import e = require('express');
import { TypeFactory } from '@fivetrandevelopers/zetasql';
import * as core from 'express-serve-static-core';
import { DbtRepository } from './DbtRepository';
import { DestinationContext } from './DestinationContext';
import { getFreePort } from './utils/Utils';

interface QueryParams {
  name: string;
  db: string;
  schema: string;
  table: string;
}

export class MacroCompilationServer {
  port?: number;

  constructor(private destinationContext: DestinationContext, private dbtRepository: DbtRepository) {
    console.log(this.destinationContext);
  }

  // TODO: start only for BigQuery
  async start(): Promise<void> {
    const app = e();
    this.port = await getFreePort();

    app.get('/macro', async (req: e.Request<core.ParamsDictionary, unknown, unknown, QueryParams>, res: e.Response) => {
      const queryParams = req.query;
      if (queryParams.name === 'get_columns_in_relation') {
        const node = this.dbtRepository.dag.nodes.find(
          n => n.getValue().database === queryParams.db && n.getValue().schema === queryParams.schema && n.getValue().name === queryParams.table,
        );
        if (node) {
          const results = await this.destinationContext.analyzeModel(node);
          const result = results.find(r => r.modelUniqueId === node.getValue().uniqueId);
          console.log(`get_columns_in_relation REF: ${queryParams.db}.${queryParams.schema}.${queryParams.table}`);
          if (result?.analyzeResult.ast.isOk()) {
            const columns = result.analyzeResult.ast.value.resolvedStatement?.resolvedQueryStmtNode?.outputColumnList
              .filter(c => c.column)
              .map(c => {
                let type = 'string';
                for (const [key, value] of TypeFactory.SIMPLE_TYPE_KIND_NAMES.entries()) {
                  if (value === c.column?.type?.typeKind) {
                    type = key;
                  }
                }

                return [c.name, type];
              });
            res.send(columns);
            return;
          }
        } else {
          // console.log(`get_columns_in_relation SOURCE: ${relation}`);
          res.send('SOURCE');
          return;
        }
      }
      console.log('NOT FOUND!');
      res.send('NOT FOUND!');
    });

    app.listen(this.port, 'localhost');
    console.log(`Macro compilation server started on port ${this.port}`);
  }
}
