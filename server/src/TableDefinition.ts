export class TableDefinition {
  name: string[];
  rawName?: string;
  datasetIndex: number;
  schema?: SchemaDefinition;
  timePartitioning = false;
  containsInformationSchema = false;

  constructor(name: string[]) {
    if (name.length === 1 && name[0].indexOf('.') > 0) {
      // for query with: inner join `singular-vector-135519.pg_public.test_table`
      this.name = name[0].split('.');
      [this.rawName] = name;
    } else {
      this.name = name;
      this.containsInformationSchema = [this.name[1], this.name[2]].some(n => this.isInformationSchema(n));
    }

    this.datasetIndex = this.name.length >= 3 ? 1 : 0;
  }

  getProjectName(): string | undefined {
    if (this.containsInformationSchema) {
      if (this.isInformationSchema(this.name[1])) {
        return undefined;
      }
      return this.name[0];
    }
    return this.name.length >= 3 ? this.name[0] : undefined;
  }

  getDatasetName(): string {
    if (this.containsInformationSchema) {
      if (this.isInformationSchema(this.name[1])) {
        return this.name[0].toLocaleLowerCase();
      }
      return this.name[1].toLocaleLowerCase();
    }
    return this.name[this.datasetIndex];
  }

  getTableName(): string {
    return this.name[this.datasetIndex + 1];
  }

  getInformationSchemaTableName(): string {
    if (this.isInformationSchema(this.name[1])) {
      return this.name[2].toLocaleLowerCase();
    }
    return this.name[3].toLocaleLowerCase();
  }

  isInformationSchema(namePart?: string): boolean {
    return namePart?.toLocaleLowerCase() === 'information_schema';
  }
}

export interface SchemaDefinition {
  fields: Array<ColumnDefinition>;
}

export interface ColumnDefinition {
  name: string;
  type: string;
  fields?: ColumnDefinition[];
  mode?: string;
}
