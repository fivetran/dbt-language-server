import { err, ok, Result } from 'neverthrow';
import { createConnection } from 'snowflake-sdk';
import { z } from 'zod';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile, TargetConfig } from '../DbtProfile';
import { SnowflakeClient } from './SnowflakeClient';

export class SnowflakeKeyPairProfile implements DbtProfile {
  static readonly DOCS = '[Key Pair configuration](https://docs.getdbt.com/reference/warehouse-setups/snowflake-setup#key-pair-authentication).';

  static readonly SCHEMA = z.object({
    type: z.literal('snowflake'),
    account: z.string(),
    user: z.string(),
    private_key_path: z.string(),
    private_key_passphrase: z.optional(z.string()),
    database: z.string(),
    warehouse: z.string(),
    schema: z.string(),
  });

  getDocsUrl(): string {
    return SnowflakeKeyPairProfile.DOCS;
  }

  validateProfile(targetConfig: TargetConfig): Result<void, string> {
    const result = SnowflakeKeyPairProfile.SCHEMA.safeParse(targetConfig);
    if (!result.success) {
      const error = result.error.errors[0];
      return err(error.path[0] as string);
    }
    return ok(undefined);
  }

  async createClient(profile: unknown): Promise<Result<DbtDestinationClient, string>> {
    const parsedProfile = SnowflakeKeyPairProfile.SCHEMA.parse(profile);
    return this.createClientInternal(parsedProfile);
  }

  private async createClientInternal(profile: z.infer<typeof SnowflakeKeyPairProfile.SCHEMA>): Promise<Result<DbtDestinationClient, string>> {
    const {
      account,
      user: username,
      private_key_path: privateKeyPath,
      private_key_passphrase: privateKeyPass,
      warehouse,
      database,
      schema,
    } = profile;
    const connection = createConnection({ account, username, privateKeyPath, privateKeyPass, warehouse, database, schema });

    const client = new SnowflakeClient(database, connection);

    const testResult = await client.test();
    if (testResult.isErr()) {
      return err(testResult.error);
    }

    return ok(client);
  }
}
