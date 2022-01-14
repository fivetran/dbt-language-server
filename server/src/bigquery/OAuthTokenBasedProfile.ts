import { BigQuery } from '@google-cloud/bigquery';
import { UserRefreshClient } from 'google-auth-library';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { DbtProfile } from '../DbtProfile';
import { BigQueryClient } from './BigQueryClient';

export class OAuthTokenBasedProfile implements DbtProfile {
  static readonly BQ_OAUTH_TOKEN_BASED_DOCS =
    '[Oauth Token-Based configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-token-based).';

  getDocsUrl(): string {
    return OAuthTokenBasedProfile.BQ_OAUTH_TOKEN_BASED_DOCS;
  }

  validateProfile(targetConfig: any): string | undefined {
    const { project } = targetConfig;
    if (!project) {
      return 'project';
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
  ): string | undefined {
    if (!refreshToken) {
      return 'refresh_token';
    }

    if (!clientId) {
      return 'client_id';
    }

    if (!clientSecret) {
      return 'client_secret';
    }

    return undefined;
  }

  private validateTemporaryTokenProfile(token: string | undefined): string | undefined {
    if (!token) {
      return 'token';
    }
    return undefined;
  }

  async createClient(profile: any): Promise<DbtDestinationClient | string> {
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
    const client = new BigQueryClient(project, bigQuery);

    const testResult = await client.test();
    if (testResult.isErr()) {
      return testResult.error;
    }

    return client;
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
