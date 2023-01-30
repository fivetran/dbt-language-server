import { err, ok, Result } from 'neverthrow';
import { z } from 'zod';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile, TargetConfig } from '../DbtProfile';

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

  createClient(_profile: Required<TargetConfig>): Promise<Result<DbtDestinationClient, string>> {
    throw new Error('Method not implemented.');
  }
}
