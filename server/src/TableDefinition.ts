export class TableDefinition {
  namePath: string[];
  rawName?: string;
  datasetIndex: number;
  schema?: SchemaDefinition;
  timePartitioning = false;
  containsInformationSchema = false;
  projectName?: string;
  dataSetName?: string;
  tableName?: string;

  constructor(namePath: string[]) {
    if (namePath.length === 1 && namePath[0].indexOf('.') > 0) {
      // for query with: inner join `singular-vector-135519.pg_public.test_table`
      this.namePath = namePath[0].split('.');
      [this.rawName] = namePath;
    } else {
      this.namePath = namePath;
      this.containsInformationSchema = [this.namePath[1], this.namePath[2]].some(n => this.isInformationSchema(n));
    }

    this.datasetIndex = this.namePath.length >= 3 ? 1 : 0;
  }

  getProjectName(): string | undefined {
    if (!this.projectName) {
      if (this.containsInformationSchema) {
        this.projectName = this.isInformationSchema(this.namePath[1]) ? undefined : this.namePath[0];
      } else {
        this.projectName = this.namePath.length >= 3 ? this.namePath[0] : undefined;
      }
    }
    return this.projectName;
  }

  getDataSetName(): string {
    if (!this.dataSetName) {
      if (this.containsInformationSchema) {
        this.dataSetName = (this.isInformationSchema(this.namePath[1]) ? this.namePath[0] : this.namePath[1]).toLocaleLowerCase();
      } else {
        this.dataSetName = this.namePath[this.datasetIndex];
      }
    }
    return this.dataSetName;
  }

  getTableName(): string {
    if (!this.tableName) {
      if (this.containsInformationSchema) {
        this.tableName = (this.isInformationSchema(this.namePath[1]) ? this.namePath[2] : this.namePath[3]).toLocaleLowerCase();
      } else {
        this.tableName = this.namePath[this.datasetIndex + 1];
      }
    }
    return this.tableName;
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
