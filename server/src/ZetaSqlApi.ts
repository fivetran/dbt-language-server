import { TypeKind as SnowflakeTypeKind } from '@fivetrandevelopers/zetasql-snowflake/lib/index';
import { TypeKind } from '@fivetrandevelopers/zetasql/lib/index';
import { LanguageFeature } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageFeature';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { LanguageVersion } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageVersion';
import { StructFieldProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/StructFieldProto';
import { TypeProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/TypeProto';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { promisify } from 'node:util';
import { ColumnDefinition } from './DbtDestinationClient';
import { ProcessExecutor } from './ProcessExecutor';
import { FeatureFinder } from './feature_finder/FeatureFinder';
import { getFreePort } from './utils/Utils';
import path = require('node:path');
import slash = require('slash');

export type SupportedDestinations = 'bigquery' | 'snowflake';

export class ZetaSqlApi {
  private zetaSql?: typeof import('@fivetrandevelopers/zetasql/lib/index') | typeof import('@fivetrandevelopers/zetasql-snowflake/lib/index');
  private languageOptions?: LanguageOptionsProto;

  constructor(private destination: SupportedDestinations) {}

  async initialize(): Promise<void> {
    console.log(`Loading ZetaSQL library for ${this.destination.toString()}`);
    this.zetaSql =
      this.destination === 'bigquery' ? await import('@fivetrandevelopers/zetasql') : await import('@fivetrandevelopers/zetasql-snowflake');

    console.log(`ZetaSQL library loaded ${JSON.stringify([...this.zetaSql.TypeFactory.SIMPLE_TYPE_KIND_NAMES.keys()])}`);

    const port = await getFreePort();
    console.log(`Starting zetasql on port ${port}`);
    if (process.platform === 'win32') {
      const subfolder = this.destination === 'bigquery' ? 'zetasql' : 'snowflake';
      const fsPath = slash(path.normalize(`${__dirname}/${subfolder}/remote_server.so`));
      const wslPath = `/mnt/${fsPath.replace(':', '')}`;
      console.log(`Path in WSL: ${wslPath}`);
      const stdHandler = (data: string): void => console.log(data);
      new ProcessExecutor()
        .execProcess(`wsl -d ${FeatureFinder.getWslUbuntuName()} "${wslPath}" 0.0.0.0 ${port}`, stdHandler, stdHandler)
        .catch(e => console.log(e));
    } else {
      this.zetaSql.runServer(port).catch(e => console.log(e));
    }

    this.initializeClient(port);
    await this.testConnection();
  }

  initializeClient(port: number): void {
    this.assertZetaSqlIsDefined(this.zetaSql);

    this.zetaSql.ZetaSQLClient.init(port);
  }

  async testConnection(): Promise<void> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    await this.zetaSql.ZetaSQLClient.getInstance().testConnection();
  }

  terminateServer(): void {
    this.assertZetaSqlIsDefined(this.zetaSql);

    this.zetaSql.terminateServer();
  }

  async analyze(request: import('@fivetrandevelopers/zetasql/lib/index').AnalyzeRequest): Promise<AnalyzeResponse__Output | undefined> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    const result = await this.zetaSql.ZetaSQLClient.getInstance().analyze(request);
    return result as AnalyzeResponse__Output | undefined; // TODO: Snowflake response is a bit different
  }

  async parse(sqlStatement: string, options?: LanguageOptionsProto): Promise<ParseResponse__Output | undefined> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    const api = this.zetaSql.ZetaSQLClient.API;
    const parse = promisify(api.parse.bind(api));

    return parse({
      sqlStatement,
      options,
    }) as Promise<ParseResponse__Output | undefined>;
  }

  async extractTableNamesFromStatement(
    request: import('@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementRequest').ExtractTableNamesFromStatementRequest,
  ): Promise<ExtractTableNamesFromStatementResponse__Output | undefined> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    return this.zetaSql.ZetaSQLClient.getInstance().extractTableNamesFromStatement(request);
  }

  async getLanguageOptions(): Promise<LanguageOptionsProto | undefined> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    if (!this.languageOptions) {
      try {
        const options = await new this.zetaSql.LanguageOptions().enableMaximumLanguageFeatures();
        const featuresForVersion = await this.zetaSql.LanguageOptions.getLanguageFeaturesForVersion(LanguageVersion.VERSION_CURRENT);
        featuresForVersion.forEach(f => options.enableLanguageFeature(f));
        options.enableLanguageFeature(LanguageFeature.FEATURE_NAMED_ARGUMENTS);
        options.enableLanguageFeature(LanguageFeature.FEATURE_JSON_TYPE);
        options.enableLanguageFeature(LanguageFeature.FEATURE_JSON_VALUE_EXTRACTION_FUNCTIONS);
        options.enableLanguageFeature(LanguageFeature.FEATURE_INTERVAL_TYPE);
        // https://github.com/google/zetasql/issues/115#issuecomment-1210881670
        options.options.reservedKeywords = ['QUALIFY'];
        this.languageOptions = options.serialize() as LanguageOptionsProto; // TODO: Snowflake settings are a bit different
      } catch (e) {
        console.log(e instanceof Error ? e.stack : e);
      }
    }
    return this.languageOptions;
  }

  getTypeKindNames(): Map<string, TypeKind> | Map<string, SnowflakeTypeKind> {
    this.assertZetaSqlIsDefined(this.zetaSql);
    return this.zetaSql.TypeFactory.SIMPLE_TYPE_KIND_NAMES;
  }

  createType(newColumn: ColumnDefinition): TypeProto {
    const lowerCaseType = newColumn.type.toLowerCase();
    const typeKind = this.zetaSql?.TypeFactory.SIMPLE_TYPE_KIND_NAMES.get(lowerCaseType) as TypeKind; // TODO: Snowflake TypeKind has more values
    let resultType: TypeProto;
    if (typeKind) {
      resultType = {
        typeKind,
      };
      // TODO: Snowflake
      if (typeKind === TypeKind.TYPE_ARRAY) {
        resultType.arrayType = {
          elementType: {
            typeKind: SnowflakeTypeKind.TYPE_VARIANT as TypeKind,
          },
        };
      }
    } else if (lowerCaseType === 'record') {
      resultType = {
        typeKind: TypeKind.TYPE_STRUCT,
        structType: {
          field: newColumn.fields?.map<StructFieldProto>(f => ({
            fieldName: f.name,
            fieldType: this.createType(f),
          })),
        },
      };
    } else {
      console.log(`Cannot find TypeKind for ${newColumn.type}`); // TODO: fix all these issues
      resultType = {
        typeKind: TypeKind.TYPE_STRING,
      };
    }
    if (newColumn.mode?.toLocaleLowerCase() === 'repeated') {
      resultType = {
        typeKind: TypeKind.TYPE_ARRAY,
        arrayType: {
          elementType: resultType,
        },
      };
    }
    return resultType;
  }

  private assertZetaSqlIsDefined<T>(value?: T): asserts value is T {
    if (!value) {
      throw new Error('ZetaSql is not initialized');
    }
  }
}
