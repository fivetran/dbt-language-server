import { err, ok, Result } from 'neverthrow';
import { createConnection } from 'snowflake-sdk';
import { z } from 'zod';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile, TargetConfig } from '../DbtProfile';
import { SnowflakeClient } from './SnowflakeClient';

export class SnowflakeUserPassProfile implements DbtProfile {
  static readonly DOCS =
    '[User / Password configuration](https://docs.getdbt.com/reference/warehouse-setups/snowflake-setup#user--password-authentication).';

  static readonly SCHEMA = z.object({
    type: z.literal('snowflake'),
    account: z.string(),
    user: z.string(),
    password: z.string(),
    database: z.string(),
    warehouse: z.string(),
    schema: z.string(),
  });

  getDocsUrl(): string {
    return SnowflakeUserPassProfile.DOCS;
  }

  validateProfile(targetConfig: TargetConfig): Result<void, string> {
    const result = SnowflakeUserPassProfile.SCHEMA.safeParse(targetConfig);
    if (!result.success) {
      const error = result.error.errors[0];
      return err(error.path[0] as string);
    }
    return ok(undefined);
  }

  async createClient(profile: unknown): Promise<Result<DbtDestinationClient, string>> {
    const parsedProfile = SnowflakeUserPassProfile.SCHEMA.parse(profile);
    return this.createClientInternal(parsedProfile);
  }

  private async createClientInternal(profile: z.infer<typeof SnowflakeUserPassProfile.SCHEMA>): Promise<Result<DbtDestinationClient, string>> {
    const { account, user: username, password, warehouse, database, schema } = profile;
    const connection = createConnection({ account, username, password, warehouse, database, schema });

    const client = new SnowflakeClient(database, connection);

    const testResult = await client.test();
    if (testResult.isErr()) {
      return err(testResult.error);
    }

    return ok(client);
  }
}
