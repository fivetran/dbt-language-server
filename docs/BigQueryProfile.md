# BigQuery

BigQuery profile can be setup using one of three authentication methods:
- [oauth via gcloud](#oauth-via-gcloud)
- [service account file](#service-account-file)
- [service account json](#service-account-json)

## OAuth via gcloud

Example of `/Users/user/.dbt/profiles.yml` using the [OAuth via gcloud](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud) authorization type:

```YAML
my-bigquery-db:
  target: prod
  outputs:
    prod:
      type: bigquery
      method: oauth
      project: google-test-project-id-400
      dataset: dbt_default
      threads: 4
```

## Service Account File

Example of `/Users/user/.dbt/profiles.yml` using the [Service Account File](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file) authorization type:

```YAML
my-bigquery-db:
  target: prod
  outputs:
    prod:
      type: bigquery
      method: service-account
      project: google-test-project-id-400
      keyfile: /Users/user/.dbt/google-test-project-id-400.json
      dataset: dbt_default
      threads: 4
```

## Service Account JSON

Example of `/Users/user/.dbt/profiles.yml` using the [Service Account JSON](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json) authorization type:

```YAML
my-bigquery-db:
  target: prod
  outputs:
    prod:
      type: bigquery
      method: service-account-json
      project: google-test-project-id-400
      dataset: dbt_default
      threads: 4

      # These fields come from the service account json keyfile
      keyfile_json:
        type: service_account
        project_id: google-test-project-id-400
        private_key_id: ...
        private_key: |
          -----BEGIN PRIVATE KEY-----
          ...
          -----END PRIVATE KEY-----
        client_email: test-bigquery@google-test-project-id-400.iam.gserviceaccount.com
        client_id: ...
        auth_uri: https://accounts.google.com/o/oauth2/auth
        token_uri: https://oauth2.googleapis.com/token
        auth_provider_x509_cert_url: https://www.googleapis.com/oauth2/v1/certs
        client_x509_cert_url: https://www.googleapis.com/robot/v1/metadata/x509/test-bigquery%40google-test-project-id-400.iam.gserviceaccount.com
```
