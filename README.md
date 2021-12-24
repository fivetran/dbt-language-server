# Language Server for dbt

This extension will help you work with dbt and BigQuery.

**Note:** Turning on [Auto Save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) is strongly recommended. With this option turned on, VS Code will save your changes after a configured delay or when focus leaves the editor. This feature is required for preview, completion and errors highlighting.

### Table of Contents

- [Features](#features)
   - [Highlighting errors](#highlighting-errors)
   - [Signature help](#signature-help)
   - [Completion for SQL](#completion-for-sql)
   - [Completion for dbt models](#completion-for-dbt-models)
   - [dbt compile preview](#dbt-compile-preview)
   - [Information on hover](#information-on-hover)
- [How to use](#how-to-use)
- [Profiles](#profiles)
   - [BigQuery Profile](#bigquery-profile)
      - [oauth via gcloud](#oauth-via-gcloud)
      - [oauth token-based](#oauth-token-based)
      - [service account file](#service-account-file)
      - [service account json](#service-account-json)

## Features

### Highlighting errors

![Highlighting errors](images/HighlightingErrors.png)

### Signature help

![Signature help](images/SignatureHelp.png)

### Completion for SQL

![Completion for SQL](images/Completion.png)

### Completion for dbt models

![Completion for dbt models](images/CompletionForModels.png)

### dbt compile preview

![dbt compile preview](images/dbtCompilePreview.png)

### Information on hover

![Information on hover](images/InformationOnHover.png)

## How to use

Extension works on macOS, now it supports the default locations for `profiles.yml` and `dbt_project.yml` files and the BigQuery destination with [OAuth via gcloud](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud), [Service Account File](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file) and [Service Account JSON](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json) authorization types.

Prior to using the extension, you need to perform the following steps:
1. [Install bigquery-dbt and dbt-rpc](https://docs.getdbt.com/dbt-cli/installation) (e.g `python3 -m pip install dbt-bigquery dbt-rpc`)
2. In Terminal, test that dbt-rpc works running the `dbt-rpc --version` command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g. `~/dbt-env/bin/python3`).
3. Create a file named `profiles.yml` in the `~/.dbt/` folder and add a profile to connect to BigQuery
   * using the [OAuth via gcloud](docs/BigQueryProfile.md#oauth-via-gcloud)
   * using the [Service Account File](docs/BigQueryProfile.md#service-account-file)
   * using the [Service Account JSON](docs/BigQueryProfile.md#service-account-json)
4. Open the dbt project root folder that contains `dbt_project.yml` for the configured profile in the new VSCode window.
5. Now you can open your model and see the dbt compile preview by right-clicking the code and choosing **Show query preview** from the context menu.

## Profiles

### BigQuery Profile

BigQuery profile can be setup using one of three authentication methods:
- [oauth via gcloud](#oauth-via-gcloud)
- [service account file](#service-account-file)
- [service account json](#service-account-json)

#### OAuth via gcloud

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

#### Oauth Token-Based

Example of `/Users/user/.dbt/profiles.yml` using the [Oauth Token-Based](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-token-based) authorization type:

##### Refresh token

```YAML
my-bigquery-db:
  target: prod
  outputs:
    prod:
      type: bigquery
      method: oauth-secrets
      project: google-test-project-id-400
      dataset: dbt_default
      threads: 4
      refresh_token: [refresh token]
      client_id: [client id]
      client_secret: [client secret]
      token_uri: https://oauth2.googleapis.com/token
```

##### Temporary token

```YAML
my-bigquery-db:
  target: prod
  outputs:
    prod:
      type: bigquery
      method: oauth-secrets
      project: google-test-project-id-400
      dataset: dbt_default
      threads: 4
      token: [temporary access token]
```

#### Service Account File

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

#### Service Account JSON

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
