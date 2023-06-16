import { SimpleColumnProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/SimpleColumnProto';
import { arraysAreEqual } from './utils/Utils';

export class TableDefinition {
  private namePath: string[];
  private datasetIndex: number;
  private informationSchemaIndex = -1;
  private projectName?: string;
  private dataSetName?: string;
  private tableName?: string;

  public timePartitioning = false;
  public external = false;
  public columns?: SimpleColumnProto[];
  public catalogCount?: number;

  constructor(namePath: string[]) {
    if (namePath.length === 1 && namePath[0].indexOf('.') > 0) {
      // Example: `singular-vector-135519.pg_public.test_table`
      this.namePath = namePath[0].split('.');
      this.catalogCount = 1;
    } else if (namePath.length === 2 && namePath[0].indexOf('.') > 0) {
      // Example: `singular-vector-135519.pg_public`.test_table
      this.namePath = [...namePath[0].split('.'), namePath[1]];
      this.catalogCount = 2;
    } else {
      this.namePath = namePath;
    }

    this.informationSchemaIndex = [0, 1, 2].find(i => this.isInformationSchema(this.namePath[i])) ?? -1;
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
    return this.projectName?.toLowerCase();
  }

  getProjectCatalogName(): string | undefined {
    return this.catalogCount === undefined ? this.getProjectName() : undefined;
  }

  getDatasetCatalogName(): string | undefined {
    let name = undefined;
    switch (this.catalogCount) {
      case 1: {
        name = undefined;
        break;
      }
      case 2: {
        name = `${this.namePath[0]}.${this.namePath[1]}`;
        break;
      }
      default: {
        name = this.getDataSetName();
        break;
      }
    }
    return name?.toLowerCase();
  }

  getTableNameInZetaSql(): string {
    let name = undefined;
    switch (this.catalogCount) {
      case 1: {
        name = this.namePath.join('.');
        break;
      }
      case 2: {
        name = this.namePath[2];
        break;
      }
      default: {
        name = this.getTableName();
        break;
      }
    }
    return name.toLowerCase();
  }

  getDataSetName(): string | undefined {
    if (!this.dataSetName) {
      this.dataSetName = (
        this.containsInformationSchema() ? this.namePath[this.informationSchemaIndex - 1] : this.namePath.at(this.datasetIndex)
      )?.toLocaleLowerCase();
    }
    return this.dataSetName;
  }

  getTableName(): string {
    if (!this.tableName) {
      this.tableName = (
        this.containsInformationSchema() ? this.namePath[this.informationSchemaIndex + 1] : this.namePath[this.datasetIndex + 1]
      ).toLocaleLowerCase();
    }
    return this.tableName;
  }

  isInformationSchema(namePart?: string): boolean {
    return namePart?.toLocaleLowerCase() === 'information_schema';
  }

  equals(other: TableDefinition): boolean {
    return arraysAreEqual(this.namePath, other.namePath) && this.catalogCount === other.catalogCount;
  }
}
