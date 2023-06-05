import express = require('express');
import { ParamsDictionary } from 'express-serve-static-core';
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

  constructor(private destinationContext: DestinationContext, private dbtRepository: DbtRepository) {}

  async start(): Promise<void> {
    const app = express();
    this.port = await getFreePort();

    app.get('/macro', async (req: express.Request<ParamsDictionary, unknown, unknown, QueryParams>, res: express.Response) => {
      const queryParams = req.query;
      if (queryParams.name === 'get_columns_in_relation' && !this.destinationContext.isEmpty()) {
        const db = queryParams.db === 'None' ? undefined : queryParams.db;
        const schema = queryParams.schema === 'None' ? undefined : queryParams.schema;
        console.log(`get_columns_in_relation: ${db ?? 'undefined'}.${schema ?? 'undefined'}.${queryParams.table}`);
        const node = this.dbtRepository.dag.nodes.find(
          n => n.getValue().database === db && n.getValue().schema === schema && n.getValue().name === queryParams.table,
        );
        if (node) {
          await this.destinationContext.analyzeModel(node);
          const columns = this.destinationContext.getColumnsInRelation(db, schema, queryParams.table);
          if (columns) {
            res.send(columns.map(c => [c.name, c.type]));
            return;
          }
          console.log('ref analysis failed.');
        } else {
          res.send('SOURCE');
          return;
        }
      }
      console.log('NOT_FOUND');
      res.send('NOT_FOUND');
    });

    app.listen(this.port, 'localhost');
    console.log(`Macro compilation server started on port ${this.port}`);
  }
}
