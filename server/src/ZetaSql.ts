import { AnalyzeRequest } from '@fivetrandevelopers/zetasql/lib/index';
import { LanguageFeature } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageFeature';
import { LanguageOptionsProto } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageOptionsProto';
import { LanguageVersion } from '@fivetrandevelopers/zetasql/lib/types/zetasql/LanguageVersion';
import { AnalyzeResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/AnalyzeResponse';
import { ExtractTableNamesFromStatementRequest } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementRequest';
import { ExtractTableNamesFromStatementResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ExtractTableNamesFromStatementResponse';
import { ParseResponse__Output } from '@fivetrandevelopers/zetasql/lib/types/zetasql/local_service/ParseResponse';
import { promisify } from 'node:util';

export type SupportedDestinations = 'bigquery' | 'snowflake';

export class ZetaSql {
  private zetaSql?: typeof import('@fivetrandevelopers/zetasql/lib/index') | typeof import('@fivetrandevelopers/zetasql-snowflake/lib/index');
  private languageOptions?: LanguageOptionsProto;

  constructor(private destination: SupportedDestinations) {}

  async initialize(): Promise<void> {
    this.zetaSql =
      this.destination === 'bigquery' ? await import('@fivetrandevelopers/zetasql') : await import('@fivetrandevelopers/zetasql-snowflake');
  }

  initializeClient(port: number): void {
    this.assertZetaSqlIsDefined(this.zetaSql);

    this.zetaSql.ZetaSQLClient.init(port);
  }

  async testConnection(): Promise<void> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    await this.zetaSql.ZetaSQLClient.getInstance().testConnection();
  }

  async runServer(port: number): Promise<void> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    await this.zetaSql.runServer(port);
  }

  async terminateServer(): Promise<void> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    await this.zetaSql.terminateServer();
  }

  async analyze(request: AnalyzeRequest): Promise<AnalyzeResponse__Output | undefined> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    const result = await this.zetaSql.ZetaSQLClient.getInstance().analyze(request);
    return result as AnalyzeResponse__Output | undefined; // TODO: Snowflake response is a bit different
  }

  async parse(sqlStatement: string, options?: LanguageOptionsProto): Promise<ParseResponse__Output | undefined> {
    this.assertZetaSqlIsDefined(this.zetaSql);

    const parse = promisify(this.zetaSql.ZetaSQLClient.API.parse.bind(this.zetaSql.ZetaSQLClient.API));
    return parse({
      sqlStatement,
      options,
    });
  }

  async extractTableNamesFromStatement(
    request: ExtractTableNamesFromStatementRequest,
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

  private assertZetaSqlIsDefined<T>(value?: T): asserts value is T {
    if (!value) {
      throw new Error('ZetaSql is not initialized');
    }
  }
}
