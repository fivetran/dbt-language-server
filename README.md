# dbt Wizard

This extension will help you work with [dbt](https://www.getdbt.com/).
Also it provides additional features for BigQuery data warehouses like [Highlighting errors](#highlighting-errors), [Completion for SQL](#completion-for-sql) and etc.

**Note:** Turning on [Auto Save](https://code.visualstudio.com/docs/editor/codebasics#_save-auto-save) is strongly recommended. With this option turned on, VS Code will save your changes after a configured delay or when the focus leaves the editor. This feature is required for preview, completion, and error highlighting.

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

### Go to definition

#### Macros
![Definition Macro](images/DefinitionMacro.png)
#### Models
![Definition Ref](images/DefinitionRef.png)
#### Sources
![Definition Source](images/DefinitionSource.png)

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

The extension works on MacOS, Linux, and Windows (for Windows, see the additional steps in the [Windows Support](docs/WindowsSupport.md) article). It supports the default locations for `profiles.yml` and `dbt_project.yml` files.

Prior to using the extension, you need to perform the following steps (**note**: replace <u><i>dbt-bigquery</i></u> with your adapter like <i><u>dbt-postgres</i></u>):
1. [Install bigquery-dbt and dbt-rpc](https://docs.getdbt.com/dbt-cli/installation) (e.g `python3 -m pip install dbt-bigquery dbt-rpc`).
1. In Terminal, test that dbt-rpc works by running the `dbt-rpc --version` command or [specifying the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VS Code that was used to install dbt (e.g., `~/dbt-env/bin/python3`).
1. Create a file named `profiles.yml` in the `~/.dbt/` folder and [add a profile](https://docs.getdbt.com/dbt-cli/configure-your-profile).
1. Open the dbt project in the new VS Code window.
1. Now you can open your model and see the dbt compile preview by right-clicking the code and choosing **Show query preview** from the context menu.

## Profiles

You can use this extension with any data warehouse which is supported by dbt. See [Available adapters](https://docs.getdbt.com/docs/available-adapters).

### BigQuery Profile

A BigQuery profile can be set up using one of the following authentication methods:
- [oauth via gcloud](#oauth-via-gcloud)
- [oauth token-based](#oauth-token-based)
- [service account file](#service-account-file)
- [service account json](#service-account-json)

#### OAuth via gcloud

An example of `/Users/user/.dbt/profiles.yml` using the [OAuth via gcloud](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-via-gcloud) authorization type:

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

An example of `/Users/user/.dbt/profiles.yml` using the [Oauth Token-Based](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#oauth-token-based) authorization type:

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

An example of `/Users/user/.dbt/profiles.yml` using the [Service Account File](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file) authorization type:

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

An example of `/Users/user/.dbt/profiles.yml` using the [Service Account JSON](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json) authorization type:

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

## Issues
If you have found any bug, have an idea or suggestion on how to improve extension, please file an issue and provide the details here: [Issues](https://github.com/fivetran/dbt-language-server/issues)
