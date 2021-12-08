# Language Server for dbt

This extension will help you work with dbt and BigQuery.\
**Note:** Turning on Auto Save is strongly recommended. With this option turned on, Vscode will save your changes after a configured delay or when focus leaves the editor. This feature is required for preview, completion and errors highlighting.

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

Extension works on macOS, now it supports the default locations for `profiles.yml` and `dbt_project.yml` files and the BigQuery destination with [Service Account File](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file) and [Service Account JSON](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json) authorization type.

Prior to using the extension, you need to perform the following steps:
1. [Install dbt](https://docs.getdbt.com/dbt-cli/installation).
2. In Terminal, test that dbt works running the `dbt --version` command or [specify the Python environment](https://code.visualstudio.com/docs/python/environments#_manually-specify-an-interpreter) for VSCode that was used to install dbt (e.g. `~/dbt-env/bin/python3`).
3. Create a file named `profiles.yml` in the `~/.dbt/` folder and add a profile to connect to BigQuery
  - using the [Service Account File authorization type](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-file):

      Example of `/Users/user/.dbt/profiles.yml`:
      ``` 
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
          timeout_seconds: 3600
          priority: interactive
          retries: 1
      ```

  - using the [Service Account JSON authorization type](https://docs.getdbt.com/reference/warehouse-profiles/bigquery-profile#service-account-json):

      Example of `/Users/user/.dbt/profiles.yml`:
      ``` 
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

4. Open the dbt project root folder that contains `dbt_project.yml` for the configured profile in the new VSCode window.
5. Now you can open your model and see the dbt compile preview by right-clicking the code and choosing **Show query preview** from the context menu.
