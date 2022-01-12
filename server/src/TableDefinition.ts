export class TableDefinition {
  name: string[];
  rawName: string | undefined;
  datasetIndex: number;
  schema: SchemaDefinition | undefined;

  constructor(name: string[]) {
    if (name.length === 1 && name[0].indexOf('.') > 0) {
      // for query with: inner join `singular-vector-135519.pg_public.test_table`
      this.name = name[0].split('.');
      [this.rawName] = name;
    } else {
      this.name = name;
    }

    this.datasetIndex = this.name.length === 3 ? 1 : 0;
  }

  getProjectName(): string | undefined {
    return this.name.length === 3 ? this.name[0] : undefined;
  }

  getDatasetName(): string {
    return this.name[this.datasetIndex];
  }

  getTableName(): string {
    return this.name[this.datasetIndex + 1];
  }
}

export interface SchemaDefinition {
  fields: Array<ColumnDefinition>;
}

interface ColumnDefinition {
  name: string;
  type: string;
}
