import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { arraysAreEqual } from './utils/Utils';

export class TableDefinition {
  namePath: string[];
  rawName?: string;
  datasetIndex: number;
  timePartitioning = false;
  informationSchemaIndex = -1;
  projectName?: string;
  dataSetName?: string;
  tableName?: string;
  columns?: SimpleColumnProto[];

  constructor(namePath: string[]) {
    if (namePath.length === 1 && namePath[0].indexOf('.') > 0) {
      // for query with: inner join `singular-vector-135519.pg_public.test_table`
      this.namePath = namePath[0].split('.');
      [this.rawName] = namePath;
    } else {
      this.namePath = namePath;

      this.informationSchemaIndex = [0, 1, 2].find(i => this.isInformationSchema(this.namePath[i])) ?? -1;
    }

    this.datasetIndex = this.namePath.length >= 3 ? 1 : 0;
  }

  schemaIsFilled(): boolean {
    return this.containsInformationSchema() || this.columns !== undefined;
  }

  containsInformationSchema(): boolean {
    return this.informationSchemaIndex > -1;
  }

  getProjectName(): string | undefined {
    if (!this.projectName) {
      if (this.containsInformationSchema()) {
        this.projectName = this.namePath[this.informationSchemaIndex - 2];
      } else {
        this.projectName = this.namePath.length >= 3 ? this.namePath[0] : undefined;
      }
    }
    return this.projectName;
  }

  getDataSetName(): string | undefined {
    if (!this.dataSetName) {
      this.dataSetName = this.containsInformationSchema()
        ? this.namePath[this.informationSchemaIndex - 1]?.toLocaleLowerCase()
        : this.namePath[this.datasetIndex];
    }
    return this.dataSetName;
  }

  getTableName(): string {
    if (!this.tableName) {
      this.tableName = this.containsInformationSchema()
        ? this.namePath[this.informationSchemaIndex + 1].toLocaleLowerCase()
        : this.namePath[this.datasetIndex + 1];
    }
    return this.tableName;
  }

  isInformationSchema(namePart?: string): boolean {
    return namePart?.toLocaleLowerCase() === 'information_schema';
  }

  equals(other: TableDefinition): boolean {
    return arraysAreEqual(this.namePath, other.namePath) && this.rawName === other.rawName;
  }
}

export interface SchemaDefinition {
  fields: ColumnDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  fields?: ColumnDefinition[];
  mode?: string;
}
