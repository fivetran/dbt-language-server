export enum DbtProfileType {
  BigQuery = 'bigquery',
}

export const profileMethods = new Map<DbtProfileType, string[]>([[DbtProfileType.BigQuery, ['service-account', 'service-account-json', 'oauth']]]);
