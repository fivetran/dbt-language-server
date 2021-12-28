import { DbtProfile } from '../DbtProfile';
import { DbtDestinationClient } from '../DbtDestinationClient';
import { BigQueryClient } from './BigQueryClient';
import { BigQuery } from '@google-cloud/bigquery';
import { UserRefreshClient } from 'google-auth-library';

export class OAuthTokenBasedProfile implements DbtProfile {
  static readonly BQ_OAUTH_TOKEN_BASED_DOCS =
    '[Oauth Token-Based configuration](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-token-based).';

  getDocsUrl(): string {
    return OAuthTokenBasedProfile.BQ_OAUTH_TOKEN_BASED_DOCS;
  }

  validateProfile(targetConfig: any): string | undefined {
    const project = targetConfig.project;
    if (!project) {
      return 'project';
    }

    const token = targetConfig.token;
    const refreshToken = targetConfig.refresh_token;
    const clientId = targetConfig.client_id;
    const clientSecret = targetConfig.client_secret;

    if (refreshToken || clientId || clientSecret) {
      return this.validateRefreshTokenProfile(refreshToken, clientId, clientSecret);
    } else {
      return this.validateTemporaryTokenProfile(token);
    }
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

  createClient(profile: any): DbtDestinationClient {
    const project = profile.project;
    const token = profile.token;
    const refreshToken = profile.refresh_token;
    const clientId = profile.client_id;
    const clientSecret = profile.client_secret;
    const scopes = profile.scopes;

    const bigQuery =
      refreshToken && clientId && clientSecret
        ? this.createRefreshTokenBigQueryClient(project, refreshToken, clientId, clientSecret, scopes)
        : this.createTemporaryTokenBigQueryClient(project, token);

    return new BigQueryClient(project, bigQuery);
  }

  async authenticateClient(client: DbtDestinationClient): Promise<string | undefined> {
    return client.test();
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
      clientId: clientId,
      clientSecret: clientSecret,
      refreshToken: refreshToken,
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
