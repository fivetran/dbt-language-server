import { Ok, Err, Result } from 'ts-results';
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

  validateProfile(targetConfig: any): Result<void, string> {
    const project = targetConfig.project;
    if (!project) {
      return Err('project');
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
  ): Result<void, string> {
    if (!refreshToken) {
      return Err('refresh_token');
    }

    if (!clientId) {
      return Err('client_id');
    }

    if (!clientSecret) {
      return Err('client_secret');
    }

    return Ok.EMPTY;
  }

  private validateTemporaryTokenProfile(token: string | undefined): Result<void, string> {
    if (!token) {
      return Err('token');
    }
    return Ok.EMPTY;
  }

  async createClient(profile: any): Promise<Result<DbtDestinationClient, string>> {
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
    const client = new BigQueryClient(project, bigQuery);

    const testResult = await client.test();
    if (testResult.err) {
      return Err(testResult.val);
    }

    return Ok(client);
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
