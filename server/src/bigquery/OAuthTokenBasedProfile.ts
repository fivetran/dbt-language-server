import { BigQuery } from '@google-cloud/bigquery';
import { UserRefreshClient } from 'google-auth-library';
import { err, ok, Result } from 'neverthrow';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile, TargetConfig } from '../DbtProfile';
import { BigQueryClient } from './BigQueryClient';

export class OAuthTokenBasedProfile implements DbtProfile {
  static readonly BQ_OAUTH_TOKEN_BASED_DOCS =
    '[Oauth Token-Based configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-token-based).';

  getDocsUrl(): string {
    return OAuthTokenBasedProfile.BQ_OAUTH_TOKEN_BASED_DOCS;
  }

  validateProfile(targetConfig: TargetConfig): Result<void, string> {
    const { project } = targetConfig;
    if (!project) {
      return err('project');
    }

    const { token } = targetConfig;
    const refreshToken = targetConfig.refresh_token;
    const clientId = targetConfig.client_id;
    const clientSecret = targetConfig.client_secret;

    if (refreshToken || clientId || clientSecret) {
      return this.validateRefreshTokenProfile(refreshToken, clientId, clientSecret);
    }
    return this.validateTemporaryTokenProfile(token);
  }

  private validateRefreshTokenProfile(
    refreshToken: string | undefined,
    clientId: string | undefined,
    clientSecret: string | undefined,
  ): Result<void, string> {
    if (!refreshToken) {
      return err('refresh_token');
    }

    if (!clientId) {
      return err('client_id');
    }

    if (!clientSecret) {
      return err('client_secret');
    }

    return ok(undefined);
  }

  private validateTemporaryTokenProfile(token: string | undefined): Result<void, string> {
    if (!token) {
      return err('token');
    }
    return ok(undefined);
  }

  async createClient<T>(profile: T): Promise<Result<DbtDestinationClient, string>> {
    return this.createClientInternal(profile as Required<TargetConfig>);
  }

  private async createClientInternal(profile: Required<TargetConfig>): Promise<Result<DbtDestinationClient, string>> {
    const { project } = profile;
    const { token } = profile;
    const refreshToken = profile.refresh_token;
    const clientId = profile.client_id;
    const clientSecret = profile.client_secret;
    const { scopes } = profile;

    const bigQuery =
      refreshToken && clientId && clientSecret
        ? this.createRefreshTokenBigQueryClient(project, refreshToken, clientId, clientSecret, scopes)
        : this.createTemporaryTokenBigQueryClient(project, token);
    const client = new BigQueryClient(project, () => bigQuery);

    const testResult = await client.test();
    if (testResult.isErr()) {
      return err(testResult.error);
    }

    return ok(client);
  }

  private createRefreshTokenBigQueryClient(
    project: string,
    refreshToken: string,
    clientId: string,
    clientSecret: string,
    scopes?: string[],
  ): BigQuery {
    const bigQuery = new BigQuery({
      projectId: project,
      scopes: scopes ?? [],
    });

    const refreshClient = new UserRefreshClient({
      clientId,
      clientSecret,
      refreshToken,
    });
    bigQuery.authClient.cachedCredential = refreshClient;

    return bigQuery;
  }

  private createTemporaryTokenBigQueryClient(project: string, token: string): BigQuery {
    const bigQuery = new BigQuery({
      projectId: project,
    });

    const refreshClient = new UserRefreshClient();
    refreshClient.credentials = {
      access_token: token,
    };
    bigQuery.authClient.cachedCredential = refreshClient;

    return bigQuery;
  }
}
