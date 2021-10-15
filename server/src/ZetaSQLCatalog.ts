import { SimpleCatalog, SimpleColumn, SimpleTable, SimpleType, TypeFactory } from '@fivetrandevelopers/zetasql';
import { LanguageOptions } from '@fivetrandevelopers/zetasql/lib/LanguageOptions';
import { ZetaSQLBuiltinFunctionOptions } from '@fivetrandevelopers/zetasql/lib/ZetaSQLBuiltinFunctionOptions';
import { TableDefinition } from './TableDefinition';

export class ZetaSQLCatalog {
  private static instance: ZetaSQLCatalog;

  readonly catalog = new SimpleCatalog('catalog');

  static getInstance(): ZetaSQLCatalog {
    if (!ZetaSQLCatalog.instance) {
      ZetaSQLCatalog.instance = new ZetaSQLCatalog();
    }

    return ZetaSQLCatalog.instance;
  }

  async register(tableDefinitions: TableDefinition[]): Promise<void> {
    for (const t of tableDefinitions) {
      let parent = this.catalog;

      if (!t.rawName) {
        const projectId = t.getProjectName();
        if (projectId) {
          let projectCatalog = this.catalog.catalogs.get(projectId);
          if (!projectCatalog) {
            projectCatalog = new SimpleCatalog(projectId);
            await this.unregisterCatalog();
            this.catalog.addSimpleCatalog(projectCatalog);
          }
          parent = projectCatalog;
        }

        let dataSetCatalog = parent.catalogs.get(t.getDatasetName());
        if (!dataSetCatalog) {
          dataSetCatalog = new SimpleCatalog(t.getDatasetName());
          if (parent === this.catalog) {
            await this.unregisterCatalog();
          }
          parent.addSimpleCatalog(dataSetCatalog);
        }
        parent = dataSetCatalog;
      }

      const tableName = t.rawName ?? t.getTableName();
      let table = parent.tables.get(tableName);
      if (!table) {
        if (t.rawName) {
          await this.unregisterCatalog();
        }
        table = new SimpleTable(tableName);
        parent.addSimpleTable(tableName, table);
      }

      for (const newColumn of t.schema?.fields ?? []) {
        const existingColumn = table.columns.find(c => c.getName() === newColumn.name);
        if (!existingColumn) {
          const type = newColumn.type.toLowerCase();
          const typeKind = TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(type);
          if (typeKind) {
            const simpleColumn = new SimpleColumn(t.getTableName(), newColumn.name, new SimpleType(typeKind));
            table.addSimpleColumn(simpleColumn);
          } else {
            console.log('Cannot find SimpleType for ' + newColumn.type);
          }
        }
      }
    }

    await this.unregisterCatalog();
    await this.registerAllLanguageFeatures();
    try {
      await this.catalog.register();
    } catch (e) {
      console.error(e);
    }
  }

  async registerAllLanguageFeatures(): Promise<void> {
    if (!this.catalog.builtinFunctionOptions) {
      const languageOptions = await new LanguageOptions().enableMaximumLanguageFeatures();
      await this.catalog.addZetaSQLFunctions(new ZetaSQLBuiltinFunctionOptions(languageOptions));
    }
  }

  async unregisterCatalog(): Promise<void> {
    if (this.catalog.registered) {
      try {
        await this.catalog.unregister();
      } catch (e) {
        console.error(e);
      }
    }
  }

  isRegistered(): boolean {
    return this.catalog.registered;
  }
}
